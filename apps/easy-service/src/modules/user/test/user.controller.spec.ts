import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../rest/user.controller';
import { UserService } from '../app/user.service';
import type { User } from '../types/interface/user.interface';

type MockedUserService = jest.Mocked<UserService>;

const createUser = (overrides: Partial<User> = {}): User => {
  const base: User = {
    _id: '65f1aabbccddeeff00112233',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    email: 'user@example.com',
    cnpj: '12345678000199',
    name: 'User Name',
    userName: 'username',
    password: 'hashed-password',
    roles: ['admin', 'user'],
  };

  return { ...base, ...overrides };
};

describe('UserController', () => {
  let controller: UserController;
  let service: MockedUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByEmailOrUserName: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService) as MockedUserService;
  });

  describe('create', () => {
    it('should call service and map response without password', async () => {
      const user = createUser();
      service.create.mockResolvedValue(user);

      const result = await controller.create({
        email: user.email,
        cnpj: user.cnpj,
        name: user.name,
        userName: user.userName,
        password: 'plain-password',
        roles: user.roles,
      });

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        _id: user._id,
        createdAt: user.createdAt,
        email: user.email,
        cnpj: user.cnpj,
        name: user.name,
        userName: user.userName,
        roles: user.roles,
      });
      expect((result as any).password).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should return mapped user when found', async () => {
      const user = createUser();
      service.findById.mockResolvedValue(user);

      const result = await controller.findById(user._id);

      expect(service.findById).toHaveBeenCalledWith(user._id);
      expect(result).toEqual({
        _id: user._id,
        createdAt: user.createdAt,
        email: user.email,
        cnpj: user.cnpj,
        name: user.name,
        userName: user.userName,
        roles: user.roles,
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      service.findById.mockResolvedValue(null);

      await expect(controller.findById('65f1aabbccddeeff00112233')).rejects.toBeInstanceOf(NotFoundException);
      await expect(controller.findById('65f1aabbccddeeff00112233')).rejects.toThrow('User not found');
    });
  });

  describe('findByEmailOrUserName', () => {
    it('should return mapped user when found', async () => {
      const user = createUser();
      service.findByEmailOrUserName.mockResolvedValue(user);

      const result = await controller.findByEmailOrUserName('identifier');

      expect(service.findByEmailOrUserName).toHaveBeenCalledWith('identifier');
      expect(result).toEqual({
        _id: user._id,
        createdAt: user.createdAt,
        email: user.email,
        cnpj: user.cnpj,
        name: user.name,
        userName: user.userName,
        roles: user.roles,
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      service.findByEmailOrUserName.mockResolvedValue(null);

      await expect(controller.findByEmailOrUserName('missing')).rejects.toBeInstanceOf(NotFoundException);
      await expect(controller.findByEmailOrUserName('missing')).rejects.toThrow('User not found');
    });

    it('should propagate BadRequestException from service', async () => {
      service.findByEmailOrUserName.mockRejectedValue(new BadRequestException('Identifier (email or username) is required'));

      await expect(controller.findByEmailOrUserName('')).rejects.toBeInstanceOf(BadRequestException);
      await expect(controller.findByEmailOrUserName('')).rejects.toThrow('Identifier (email or username) is required');
    });
  });

  describe('update', () => {
    it('should call service and return mapped user', async () => {
      const user = createUser({
        email: 'updated@example.com',
        name: 'Updated Name',
      });
      service.update.mockResolvedValue(user);

      const result = await controller.update(user._id, {
        email: user.email,
        name: user.name,
      });

      expect(service.update).toHaveBeenCalledWith({ email: user.email, name: user.name, _id: user._id });
      expect(result).toEqual({
        _id: user._id,
        createdAt: user.createdAt,
        email: user.email,
        cnpj: user.cnpj,
        name: user.name,
        userName: user.userName,
        roles: user.roles,
      });
    });
  });
});
