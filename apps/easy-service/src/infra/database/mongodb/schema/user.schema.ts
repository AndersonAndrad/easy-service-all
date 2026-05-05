import mongoose, { Schema } from 'mongoose';
import type { User } from 'src/modules/user/types/interface/user.interface';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, index: true, unique: true },
    cnpj: { type: String, required: true },
    name: { type: String, required: true },
    userName: { type: String, required: true, index: true, unique: true },
    password: { type: String, required: true },
    roles: { type: [String], required: true, default: [] },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
  },
);

export const userModel = mongoose.model<User>('users', UserSchema);
