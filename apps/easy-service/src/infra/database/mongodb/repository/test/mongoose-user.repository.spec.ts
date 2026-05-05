import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import type { User } from 'src/modules/user/types/interface/user.interface';
import { MongooseUserRepository } from '../mongoose-user.repository';
import { userModel } from '../../schema/user.schema';
import { parseDocumentToObj } from 'src/shared/utils/mongoose.utils';

jest.mock('src/shared/utils/mongoose.utils', () => ({
  parseDocumentToObj: jest.fn(),
}));

type UserInput = Omit<User, '_id' | 'createdAt'>;

const createUser = (overrides: Partial<User> = {}): User => {
  const base: User = {
    _id: 'user-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    email: 'user@example.com',
    cnpj: '12345678000199',
    name: 'user name',
    userName: 'username',
    password: 'password',
    roles: ['user'],
  };

  return { ...base, ...overrides };
};

describe('MongooseUserRepository', () => {
  let repository: MongooseUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new MongooseUserRepository();
  });

  describe('create', () => {
    it('should create a user and map the document to a plain object', async () => {
      const input: UserInput = {
        email: 'user@example.com',
        cnpj: '12345678000199',
        name: 'user name',
        userName: 'username',
        password: 'password',
        roles: ['user'],
      };

      const createdDoc = { _id: 'created-id', toObject: jest.fn() } as unknown as typeof userModel;
      const expected = createUser({ _id: 'created-id' });

      jest.spyOn(userModel, 'create').mockResolvedValue(createdDoc as never);
      (parseDocumentToObj as jest.Mock).mockReturnValue(expected);

      const result = await repository.create(input);

      expect(userModel.create).toHaveBeenCalledWith(input);
      expect(parseDocumentToObj).toHaveBeenCalledWith(createdDoc);
      expect(result).toEqual(expected);
    });

    it('should throw BadRequestException when duplicate key error occurs', async () => {
      const input: UserInput = {
        email: 'user@example.com',
        cnpj: '12345678000199',
        name: 'user name',
        userName: 'username',
        password: 'password',
        roles: ['user'],
      };

      const error = {
        code: 11000,
        keyPattern: { userName: 1 },
        keyValue: { userName: 'username' },
      };

      jest.spyOn(userModel, 'create').mockRejectedValue(error as never);

      await expect(repository.create(input)).rejects.toBeInstanceOf(BadRequestException);
      await expect(repository.create(input)).rejects.toThrow('User with provided userName already exists');
    });

    it('should wrap non-duplicate errors as InternalServerErrorException', async () => {
      const input: UserInput = {
        email: 'user@example.com',
        cnpj: '12345678000199',
        name: 'user name',
        userName: 'username',
        password: 'password',
        roles: ['user'],
      };

      const error = new Error('unexpected');

      jest.spyOn(userModel, 'create').mockRejectedValue(error as never);

      await expect(repository.create(input)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findById', () => {
    it('should return mapped user when document is found', async () => {
      const doc = { _id: 'user-id' } as unknown as typeof userModel;
      const expected = createUser();

      jest.spyOn(userModel, 'findById').mockResolvedValue(doc as never);
      (parseDocumentToObj as jest.Mock).mockReturnValue(expected);

      const result = await repository.findById('user-id');

      expect(userModel.findById).toHaveBeenCalledWith('user-id');
      expect(parseDocumentToObj).toHaveBeenCalledWith(doc);
      expect(result).toEqual(expected);
    });

    it('should return null when document is not found', async () => {
      jest.spyOn(userModel, 'findById').mockResolvedValue(null as never);

      const result = await repository.findById('missing-id');

      expect(userModel.findById).toHaveBeenCalledWith('missing-id');
      expect(result).toBeNull();
      expect(parseDocumentToObj).not.toHaveBeenCalled();
    });
  });

  describe('findByEmailOrUserName', () => {
    it('should normalize identifier and search by email or username', async () => {
      const identifier = '  USER@Example.Com ';
      const normalized = 'user@example.com';
      const doc = { _id: 'user-id' } as unknown as typeof userModel;
      const expected = createUser();

      jest.spyOn(userModel, 'findOne').mockResolvedValue(doc as never);
      (parseDocumentToObj as jest.Mock).mockReturnValue(expected);

      const result = await repository.findByEmailOrUserName(identifier);

      expect(userModel.findOne as jest.Mock).toHaveBeenCalledWith({
        $or: [{ email: normalized }, { userName: normalized }],
      });
      expect(parseDocumentToObj).toHaveBeenCalledWith(doc);
      expect(result).toEqual(expected);
    });

    it('should return null when no document matches identifier', async () => {
      jest.spyOn(userModel, 'findOne').mockResolvedValue(null as never);

      const result = await repository.findByEmailOrUserName('missing');

      expect(userModel.findOne as jest.Mock).toHaveBeenCalled();
      expect(result).toBeNull();
      expect(parseDocumentToObj).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user and return mapped document', async () => {
      const payload: Partial<User> = {
        _id: 'user-id',
        name: 'updated name',
      };

      const updatedDoc = { _id: 'user-id', name: 'updated name' } as unknown as typeof userModel;
      const expected = createUser({ name: 'updated name' });

      jest.spyOn(userModel, 'findByIdAndUpdate').mockResolvedValue(updatedDoc as never);
      (parseDocumentToObj as jest.Mock).mockReturnValue(expected);

      const result = await repository.update(payload);

      expect(userModel.findByIdAndUpdate as jest.Mock).toHaveBeenCalledWith(payload._id, payload, {
        returnDocument: 'after',
      });
      expect(parseDocumentToObj).toHaveBeenCalledWith(updatedDoc);
      expect(result).toEqual(expected);
    });
  });
});
