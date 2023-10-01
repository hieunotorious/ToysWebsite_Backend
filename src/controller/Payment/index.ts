import { Request, Response } from 'express';
import { round } from 'lodash';
import moment from 'moment';
import { stripe } from 'src';
import { CheckoutRequest, CheckoutResponse, ConfirmPaymentRequest } from 'src/models/api/payment';
import Product from 'src/models/product';
import Purchase from 'src/models/purchase';
import User from 'src/models/user';
import { orderedSerializer } from 'src/serializers';
import { getIdFromReq } from 'src/utils/token';
import Stripe from 'stripe';

const checkout = async (req: Request, res: Response) => {
  try {
    const user_id = getIdFromReq(req);
    const { paymentMethodType, currency }: CheckoutRequest = req.body;

    const user = await User.findById(user_id);
    if (!user) return res.status(500).json({ message: 'error.user.not_found' });

    // Create a PaymentIntent with the order amount and currency.
    const params: Stripe.PaymentIntentCreateParams = {
      amount: round(user.cart_total * 100), //api count by cent (100cent = $1)
      currency: currency ?? 'usd',
      description: `name: ${user.username}, email: ${user.email}`,
      payment_method_types: [paymentMethodType]
    };
    // If this is for an ACSS payment, we add payment_method_options to create
    // the Mandate.
    if (paymentMethodType === 'acss_debit') {
      params.payment_method_options = {
        acss_debit: {
          mandate_options: {
            payment_schedule: 'sporadic',
            transaction_type: 'personal'
          }
        }
      };
    } else if (paymentMethodType === 'customer_balance') {
      params.payment_method_data = {
        type: 'customer_balance'
      } as any;
      params.confirm = true;
      params.customer = user_id || (await stripe.customers.create().then((data) => data.id));
    }

    const paymentIntent: Stripe.PaymentIntent = await stripe.paymentIntents.create(params);
    const resData: CheckoutResponse = {
      clientSecret: paymentIntent.client_secret,
      nextAction: paymentIntent.next_action
    };
    return res.status(200).json(resData);
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const confirmPayment = async (req: Request, res: Response) => {
  try {
    const user_id = getIdFromReq(req);
    const { payment_method, billing_details }: ConfirmPaymentRequest = req.body;
    const user = await User.findById(user_id);
    const payment = await stripe.paymentMethods.retrieve(payment_method);
    if (user) {
      const purchase = new Purchase({
        user_id,
        status: 'PACKAGE',
        total_bill: user.cart_total,
        payment_method: payment.card?.brand || '',
        package_date: moment().format(),
        billingDetails: billing_details,
        products: user.cart
      });

      const savedPurchase = await purchase.save();
      if (savedPurchase) {
        const userOrdered = await Purchase.find({ user_id });
        const updatedProductsReq = user.cart.map(async (item) => {
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: item.product_id },
            {
              $inc: {
                storage_quantity: -item.quantity
              }
            },
            { new: true }
          );
          return updatedProduct;
        });

        await Promise.all(updatedProductsReq);

        const formattedOrdered = userOrdered.map((order) => orderedSerializer(order));

        return res.status(200).json(formattedOrdered);
      } else {
        return res.status(500).json({ message: 'error.user.cart.failed_to_checkout' });
      }
    } else {
      return res.status(404).json({ message: 'error.user.not_found' });
    }
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const productCheck = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quantity: number = req.body.quantity;
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ message: 'error.product.not_found' });

    if (product.storage_quantity < quantity) return res.status(200).json({ success: false });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

export default { checkout, confirmPayment, productCheck };
