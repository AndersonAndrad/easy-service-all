import { BadRequestException } from '@nestjs/common';
import { isPasswordValid } from 'src/shared/utils/password.util';
import { UserEntity } from '../domain/user.entity';
import type { User } from '../types/interface/user.interface';

type UserInput = Omit<User, '_id' | 'createdAt'>;

const createInput = (overrides: Partial<UserInput> = {}): UserInput => {
  const base: UserInput = {
    email: '  USER@Example.Com ',
    cnpj: '12.345.678/0001-99',
    name: '  User   Name  ',
    userName: '  USERNAME ',
    password: 'Pa$$w0rd',
    roles: [' ADMIN ', 'user', '   '],
  };

  return { ...base, ...overrides };
};

describe('UserEntity', () => {
  it('should normalize and validate all fields and hash password', () => {
    const input = createInput();

    const entity = new UserEntity(input);

    expect(entity.email).toBe('user@example.com');
    expect(entity.cnpj).toBe('12345678000199');
    expect(entity.name).toBe('user name');
    expect(entity.userName).toBe('username');
    expect(entity.roles).toEqual(['admin', 'user']);

    expect(entity.password).not.toBe(input.password);
    expect(isPasswordValid(input.password, entity.password)).toBe(true);
  });

  it('should hash password with minimum length', () => {
    const rawPassword = '  Pa$$w0rd  ';
    const input = createInput({ password: rawPassword });

    const entity = new UserEntity(input);

    expect(entity.password).not.toBe(rawPassword.trim());
    expect(isPasswordValid(rawPassword.trim(), entity.password)).toBe(true);
  });

  it('should throw when roles array is empty', () => {
    const input = createInput({ roles: [] });

    expect(() => new UserEntity(input)).toThrow(BadRequestException);
    expect(() => new UserEntity(input)).toThrow('Roles are required');
  });

  it('should throw when roles are only empty/whitespace', () => {
    const input = createInput({ roles: ['   ', '\n', '\t'] });

    expect(() => new UserEntity(input)).toThrow(BadRequestException);
    expect(() => new UserEntity(input)).toThrow('Roles are required');
  });

  it('should normalize multiple valid roles', () => {
    const input = createInput({ roles: [' ADMIN ', ' MANAGER ', ' user '] });

    const entity = new UserEntity(input);

    expect(entity.roles).toEqual(['admin', 'manager', 'user']);
  });
});
