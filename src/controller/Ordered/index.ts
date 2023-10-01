import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { CMSList, UpdateOrderedRequest } from 'src/models/api/cms';
import Purchase, { PurchaseResponse, PurchaseTypeModel } from 'src/models/purchase';
import { orderedSerializer } from 'src/serializers';
import { getIdFromReq } from 'src/utils/token';

const getOrderedList = async (req: Request, res: Response) => {
  try {
    const { offset, limit, search } = req.query;
    const searchFilter = search ? { $text: { $search: search.toString() } } : {};
    const filter: FilterQuery<PurchaseTypeModel> = {
      ...searchFilter
    };

    const ordered = await Purchase.find(filter)
      .skip(parseInt(offset?.toString() ?? '0'))
      .limit(parseInt(limit?.toString() ?? '0'))
      .sort({ createdAt: -1 });
    const total = await Purchase.find(filter).count();

    const formattedOrdered = ordered.map((order) => orderedSerializer(order));

    return res.status(200).json({ data: formattedOrdered, total } as CMSList<PurchaseResponse[]>);
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const getSelfOrdered = async (req: Request, res: Response) => {
  try {
    const _id = getIdFromReq(req);
    const ordered = await Purchase.find({ user_id: _id }).sort({
      createdAt: -1
    });

    const formattedOrdered = ordered.map((order) => orderedSerializer(order));

    if (ordered) return res.status(200).json(formattedOrdered);
    return res.status(404).json({ message: 'error.purchase.not_found' });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const getOrdered = async (req: Request, res: Response) => {
  try {
    const _id = req.params.id;
    const purchase = await Purchase.findById(_id);
    if (purchase) return res.status(200).json(orderedSerializer(purchase));
    return res.status(404).json({ message: 'error.purchase.not_found' });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const updateOrdered = async (req: Request, res: Response) => {
  try {
    const _id = req.params.id;
    const { status, arrive_date, package_date, total_bill, billingDetails }: UpdateOrderedRequest =
      req.body;

    const updatedPurchase = await Purchase.findOneAndUpdate(
      { _id },
      {
        $set: {
          status,
          arrive_date,
          package_date,
          total_bill,
          billingDetails
        }
      },
      { new: true }
    );
    if (!updatedPurchase)
      return res.status(500).json({ message: 'error.purchase.failed_to_update' });
    return res.status(200).json(orderedSerializer(updatedPurchase));
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

export default { getOrdered, getOrderedList, getSelfOrdered, updateOrdered };
