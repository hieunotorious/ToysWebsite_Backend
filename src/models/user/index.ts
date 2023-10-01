import { Schema, model, Document } from 'mongoose';
import { ProductCart, ProductCartType } from 'src/models/cart';

/*********************TYPE & INTERFACE*****************************/

export enum Gender {
  Male = 'MALE',
  Female = 'FEMALE',
  other = 'OTHER'
}

export type UserInfoType = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  sex?: Gender;
  avatar?: string;
  address?: AddressType;
};

export type AddressType = {
  country: string;
  city: string;
  state: string;
  line1: string;
  line2?: string;
};

export type UserType = {
  displayName?: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  birthday: string;
  info: UserInfoType;
  cart_total: number;
  cart: ProductCartType[];
};

export enum Role {
  user = 'USER',
  admin = 'ADMIN',
  owner = 'OWNER',
  shipper = 'SHIPPER',
  super_admin = 'SUPER_ADMIN'
}

export type UserResponse = Omit<UserType, 'password'> & {
  _id: string;
};

export type UserTypeModel = UserType & Document;

/*******************************SCHEMA*****************************/

export const Address = {
  country: String,
  city: String,
  state: String,
  line1: String,
  line2: String
};

export const UserInfo = {
  first_name: String,
  last_name: String,
  phone: String,
  sex: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
  avatar: String,
  address: Address
};

const userSchema = new Schema(
  {
    displayName: String,
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['USER', 'ADMIN', 'OWNER', 'SHIPPER', 'SUPER_ADMIN'],
      default: 'USER'
    },
    birthday: { type: String, required: true },
    info: UserInfo,
    cart_total: { type: Number, default: 0 },
    cart: [ProductCart]
  },
  { timestamps: true }
);

export default model<UserTypeModel>('User', userSchema);
