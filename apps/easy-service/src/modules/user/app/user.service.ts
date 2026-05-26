import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from 'src/infra/database/mongodb/repository/mongoose-user.repository';
import { UserEntity } from '../domain/user.entity';
import { User } from '../types/interface/user.interface';
import type { UserRepository } from '../types/repository/user.repository';

@Injectable()
export class UserService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async create(user: Omit<User, '_id' | 'createdAt'>): Promise<User> {
    const entity = new UserEntity(user);
    return this.userRepository.create(entity);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findById(id: string): Promise<User | null> {
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }

    return this.userRepository.findById(id);
  }

  async findByEmailOrUserName(identifier: string): Promise<User | null> {
    if (!identifier || !identifier.trim()) throw new BadRequestException('Identifier (email or username) is required');

    return this.userRepository.findByEmailOrUserName(identifier);
  }

  async update(user: Partial<User>): Promise<User> {
    const payload = user as Partial<User>;
    if (payload._id && !this.isValidObjectId(String(payload._id))) {
      throw new BadRequestException('Invalid user id');
    }

    if (payload.email || payload.cnpj || payload.name || payload.userName || payload.roles) {
      const current = await this.userRepository.findById(String(payload._id));
      if (!current) {
        return this.userRepository.update(payload);
      }
      const merged: Omit<User, '_id' | 'createdAt'> = {
        email: payload.email ?? current.email,
        cnpj: payload.cnpj ?? current.cnpj,
        name: payload.name ?? current.name,
        userName: payload.userName ?? current.userName,
        password: payload.password ?? current.password,
        roles: payload.roles ?? current.roles,
      };
      const entity = new UserEntity(merged);
      return this.userRepository.update({ ...entity, _id: current._id });
    }
    return this.userRepository.update(payload);
  }

  async delete(id: string): Promise<void> {
    if (!this.isValidObjectId(id)) throw new BadRequestException('Invalid user id');
    await this.userRepository.delete(id);
  }

  private isValidObjectId(id: string): boolean {
    return /^[a-fA-F0-9]{24}$/.test(id);
  }
}
