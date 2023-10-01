import { Request, Response } from 'express';
import mongoose, { FilterQuery } from 'mongoose';
import { CMSList } from 'src/models/api/cms';
import { ProductRatingRequest } from 'src/models/api/product';
import Product, {
  ProductResponse,
  ProductSort,
  ProductType,
  ProductTypeModel,
  RatingType
} from 'src/models/product';
import Purchase from 'src/models/purchase';
import User from 'src/models/user';
import { productSerializer } from 'src/serializers';
import { getIdFromReq } from 'src/utils/token';

const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { offset, limit, title, category, brand, color, price, sort } = req.query;

    const titleFilter = title ? { $text: { $search: title.toString() } } : {};
    const categoryFilter = category ? { category: category.toString() } : {};
    const brandFilter = brand ? { brand: brand.toString() } : {};
    const colorFilter = color ? { colors: { $in: [color.toString()] } } : {};
    const priceFilter = price ? { price: { $lte: parseFloat(price.toString()) } } : {};
    const filter: FilterQuery<ProductTypeModel> = {
      ...titleFilter,
      ...categoryFilter,
      ...brandFilter,
      ...colorFilter,
      ...priceFilter
    };
    let sortBy = {};
    switch (sort?.toString()) {
      case ProductSort.price_des:
        sortBy = { price: -1, title: 1 };
        break;
      case ProductSort.price_asc:
        sortBy = { price: 1, title: 1 };
        break;
      case ProductSort.name_des:
        sortBy = { title: -1 };
        break;
      case ProductSort.name_asc:
        sortBy = { title: 1 };
        break;
      default:
        sortBy = {};
        break;
    }

    const products = await Product.find(filter)
      .sort(sortBy)
      .skip(parseInt(offset?.toString() ?? '0'))
      .limit(parseInt(limit?.toString() ?? '0'));

    const formattedProducts = products.map((product) => productSerializer(product));

    return res.status(200).json(formattedProducts);
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const featuredProducts = await Product.find()
      .sort({
        'rating.rate': 'desc',
        'rating.num_of_rate': 'desc',
        price: 'desc'
      })
      .limit(parseInt(limit?.toString() ?? '3'));

    const formattedProducts = featuredProducts.map((product) => productSerializer(product));

    return res.status(200).json(formattedProducts);
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const getProduct = async (req: Request, res: Response) => {
  try {
    const _id = req.params.id;
    const product = await Product.findById(_id);
    if (product) {
      return res.status(200).json(productSerializer(product));
    } else {
      return res.status(404).json({ message: 'error.product.not_found' });
    }
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      img,
      gallery,
      title,
      description,
      category,
      brand,
      price,
      sku,
      storage_quantity,
      colors
    }: ProductType = req.body;
    const _id = new mongoose.Types.ObjectId();
    const product = new Product({
      _id,
      img,
      gallery,
      title,
      description,
      category,
      brand,
      price,
      sku,
      storage_quantity,
      colors
    });
    const savedProduct = await product.save();
    if (savedProduct) {
      return res.status(201).json(productSerializer(savedProduct));
    } else {
      return res.status(500).json({ message: 'error.product.failed_to_create' });
    }
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const updateProduct = async (req: Request, res: Response) => {
  try {
    const _id = req.params.id;
    const {
      img,
      gallery,
      title,
      description,
      category,
      brand,
      price,
      sku,
      storage_quantity,
      colors
    }: ProductType = req.body;

    const updatedProduct = await Product.findOneAndUpdate(
      { _id },
      {
        $set: {
          img,
          gallery,
          title,
          description,
          category,
          brand,
          price,
          sku,
          storage_quantity,
          colors
        }
      },
      { new: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: 'error.product.failed_to_update' });
    return res.status(200).json(productSerializer(updatedProduct));
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const deleteProduct = async (req: Request, res: Response) => {
  try {
    const _id = req.params.id;
    await Product.deleteOne({ _id });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const ratingProduct = async (req: Request, res: Response) => {
  try {
    const _id = getIdFromReq(req);
    const product_id = req.params.id;
    const { rate, purchase_id, color }: ProductRatingRequest = req.body;

    const user = await User.findById(_id);
    const purchase = await Purchase.findById(purchase_id);
    if (purchase && user) {
      const productIndex = purchase.products.findIndex(
        (item) => item.product_id === product_id && item.color === color
      );
      if (productIndex > -1) {
        purchase.products[productIndex].rating = rate;
        await purchase.save();
        const product = await Product.findById(product_id);
        if (product) {
          const newRating: RatingType = {
            rate: product.rating?.rate
              ? (product.rating.rate * product.rating.num_of_rate + rate) /
                (product.rating.num_of_rate + 1)
              : rate,
            num_of_rate: product.rating?.num_of_rate ? product.rating.num_of_rate + 1 : 1
          };

          const updatedProduct = await Product.findOneAndUpdate(
            { _id: product_id },
            {
              $addToSet: {
                review: {
                  user_id: user._id,
                  name: user.username,
                  email: user.email,
                  phone: user.info.phone
                }
              },

              $set: {
                rating: newRating
              }
            },
            { new: true }
          );
          if (!updatedProduct)
            return res.status(500).json({ message: 'error.product.failed_to_rating' });

          return res.status(200).json({ success: true });
        } else {
          return res.status(500).json({ message: 'error.product.failed_to_rating' });
        }
      } else {
        return res.status(500).json({ message: 'error.product.not_found' });
      }
    } else {
      return res.status(500).json({ message: 'error.purchase.not_found' });
    }
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

const getCmsAllProducts = async (req: Request, res: Response) => {
  try {
    const { offset, limit, search } = req.query;
    const searchFilter = search ? { $text: { $search: search.toString() } } : {};
    const filter: FilterQuery<ProductTypeModel> = {
      ...searchFilter
    };

    const products = await Product.find(filter)
      .skip(parseInt(offset?.toString() ?? '0'))
      .limit(parseInt(limit?.toString() ?? '0'));
    const total = await Product.find(filter).count();
    const formattedProducts = products.map((product) => productSerializer(product));

    return res.status(200).json({
      data: formattedProducts,
      total
    } as CMSList<ProductResponse[]>);
  } catch (err) {
    return res.status(500).json({ message: err });
  }
};

export default {
  getFeaturedProducts,
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  ratingProduct,
  getCmsAllProducts
};
