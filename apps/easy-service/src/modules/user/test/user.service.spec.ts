import { BadRequestException } from '@nestjs/common';
import { UserService } from '../app/user.service';
import type { User } from '../types/interface/user.interface';
import type { UserRepository } from '../types/repository/user.repository';
import { UserEntity } from '../domain/user.entity';

type MockedUserRepository = jest.Mocked<UserRepository>;

const createUser = (overrides: Partial<User> = {}): User => {
  const base: User = {
    _id: '65f1aabbccddeeff00112233',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    email: 'user@example.com',
    cnpj: '12.345.678/0001-99',
    name: 'User Name',
    userName: 'username',
    password: 'password',
    roles: ['admin', 'user'],
  };

  return { ...base, ...overrides };
};

const createRepositoryMock = (): MockedUserRepository => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByEmailOrUserName: jest.fn(),
  update: jest.fn(),
});

describe('UserService', () => {
  let repository: MockedUserRepository;
  let service: UserService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new UserService(repository);
  });

  describe('create', () => {
    it('should create a user using UserEntity and repository', async () => {
      const input: Omit<User, '_id' | 'createdAt'> = {
        email: '  USER@Example.Com ',
        cnpj: '12.345.678/0001-99',
        name: '  User   Name ',
        userName: ' USERNAME ',
        password: 'password',
        roles: [' ADMIN ', 'user', '   '],
      };

      const expectedCreated = createUser({
        email: 'user@example.com',
        cnpj: '12345678000199',
        name: 'user name',
        userName: 'username',
        roles: ['admin', 'user'],
      });

      repository.create.mockResolvedValue(expectedCreated);

      const result = await service.create(input);

      expect(repository.create).toHaveBeenCalledTimes(1);
      const entityArgument = repository.create.mock.calls[0][0] as UserEntity;

      expect(entityArgument).toBeInstanceOf(UserEntity);
      expect(entityArgument.email).toBe('user@example.com');
      expect(entityArgument.cnpj).toBe('12345678000199');
      expect(entityArgument.name).toBe('user name');
      expect(entityArgument.userName).toBe('username');
      expect(entityArgument.roles).toEqual(['admin', 'user']);
      expect(entityArgument.password).not.toBe(input.password);

      expect(result).toEqual(expectedCreated);
    });
  });

  describe('findById', () => {
    it('should delegate to repository', async () => {
      const user = createUser();
      repository.findById.mockResolvedValue(user);

      const result = await service.findById(user._id);

      expect(repository.findById).toHaveBeenCalledWith(user._id);
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      const id = '65f1aabbccddeeff00112234';

      const result = await service.findById(id);

      expect(repository.findById).toHaveBeenCalledWith(id);
      expect(result).toBeNull();
    });

    it('should throw BadRequestException when id is invalid', async () => {
      await expect(service.findById('invalid-id')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.findById('invalid-id')).rejects.toThrow('Invalid user id');
      expect(repository.findById).not.toHaveBeenCalled();
    });
  });

  describe('findByEmailOrUserName', () => {
    it('should delegate to repository', async () => {
      const user = createUser();
      repository.findByEmailOrUserName.mockResolvedValue(user);

      const result = await service.findByEmailOrUserName('identifier');

      expect(repository.findByEmailOrUserName).toHaveBeenCalledWith('identifier');
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      repository.findByEmailOrUserName.mockResolvedValue(null);

      const result = await service.findByEmailOrUserName('missing@example.com');

      expect(repository.findByEmailOrUserName).toHaveBeenCalledWith('missing@example.com');
      expect(result).toBeNull();
    });

    it('should throw BadRequestException when identifier is empty', async () => {
      await expect(service.findByEmailOrUserName('')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.findByEmailOrUserName('')).rejects.toThrow('Identifier (email or username) is required');
      expect(repository.findByEmailOrUserName).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should merge payload with current user when editable fields are present and current exists', async () => {
      const current = createUser({
        email: 'current@example.com',
        cnpj: '11.111.111/0001-11',
        name: 'Current Name',
        userName: 'currentuser',
        password: 'current-password',
        roles: ['user'],
      });

      repository.findById.mockResolvedValue(current);

      const payload: Partial<User> = {
        _id: current._id,
        email: '  NEW@Example.com ',
        name: '  New   Name ',
        roles: [' ADMIN ', '  '],
      };

      repository.update.mockImplementation(
        async (user: Partial<User>): Promise<User> => ({
          ...(current as User),
          ...(user as User),
        }),
      );

      const result = await service.update(payload);

      expect(repository.findById).toHaveBeenCalledWith(String(payload._id));
      expect(repository.update).toHaveBeenCalledTimes(1);

      expect(result._id).toBe(current._id);
      expect(result.email).toBe('new@example.com');
      expect(result.cnpj).toBe('11111111000111');
      expect(result.name).toBe('new name');
      expect(result.userName).toBe('currentuser');
      expect(result.roles).toEqual(['admin']);
      expect(result.password).not.toBe(current.password);
    });

    it('should call update directly when editable fields are present and current does not exist', async () => {
      const payload: Partial<User> = {
        _id: '65f1aabbccddeeff00112235',
        email: 'missing@example.com',
      };

      const updated = createUser({
        _id: '65f1aabbccddeeff00112235',
        email: 'missing@example.com',
      });

      repository.findById.mockResolvedValue(null);
      repository.update.mockResolvedValue(updated);

      const result = await service.update(payload);

      expect(repository.findById).toHaveBeenCalledWith('65f1aabbccddeeff00112235');
      expect(repository.update).toHaveBeenCalledWith(payload);
      expect(result).toEqual(updated);
    });

    it('should call update directly when no editable fields are present', async () => {
      const payload: Partial<User> = {
        _id: '65f1aabbccddeeff00112233',
        password: 'new-password',
      };

      const updated = createUser({
        _id: '65f1aabbccddeeff00112233',
        password: 'new-password',
      });

      repository.update.mockResolvedValue(updated);

      const result = await service.update(payload);

      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(payload);
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException when _id is invalid on update', async () => {
      const payload: Partial<User> = {
        _id: 'invalid-id',
        email: 'test@example.com',
      };

      await expect(service.update(payload)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.update(payload)).rejects.toThrow('Invalid user id');
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
