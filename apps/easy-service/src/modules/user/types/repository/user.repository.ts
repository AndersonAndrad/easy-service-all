import { User } from '../interface/user.interface';

export interface UserRepository {
  create(user: Omit<User, '_id' | 'createdAt'>): Promise<User>;

  findById(id: string): Promise<User | null>;

  findByEmailOrUserName(identifier: string): Promise<User | null>;

  update(user: Partial<User>): Promise<User>;
}
