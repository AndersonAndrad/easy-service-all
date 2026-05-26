import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from 'src/modules/user/types/interface/user.interface';
import { UserRepository } from 'src/modules/user/types/repository/user.repository';
import { parseDocumentToObj } from 'src/shared/utils/mongoose.utils';
import { userModel } from '../schema/user.schema';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Injectable()
export class MongooseUserRepository implements UserRepository {
  async create(user: Omit<User, '_id' | 'createdAt'>): Promise<User> {
    try {
      const created = await userModel.create(user);
      return parseDocumentToObj(created);
    } catch (caught: unknown) {
      const err = caught as { code?: number; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> };

      if (err.code === 11000 && err.keyPattern && err.keyValue) {
        const fields = Object.keys(err.keyPattern);
        const fieldList = fields.join(', ');
        throw new BadRequestException(`User with provided ${fieldList} already exists`);
      }

      if (caught instanceof HttpException) throw caught;
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(): Promise<User[]> {
    const docs = await userModel.find().sort({ createdAt: -1 });
    return docs.map((d) => parseDocumentToObj(d));
  }

  async findById(id: string): Promise<User | null> {
    const doc = await userModel.findById(id);
    return doc ? parseDocumentToObj(doc) : null;
  }

  async findByEmailOrUserName(identifier: string): Promise<User | null> {
    const normalized = identifier.trim().toLowerCase();

    const doc = await userModel.findOne({ $or: [{ email: normalized }, { userName: normalized }] });

    return doc ? parseDocumentToObj(doc) : null;
  }

  async update(user: Partial<User>): Promise<User> {
    const updated = await userModel.findByIdAndUpdate(user._id, user, { returnDocument: 'after' });
    return parseDocumentToObj(updated);
  }

  async delete(id: string): Promise<void> {
    await userModel.findByIdAndDelete(id);
  }
}
