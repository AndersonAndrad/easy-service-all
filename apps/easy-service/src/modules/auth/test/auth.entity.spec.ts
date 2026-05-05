import { BadRequestException } from '@nestjs/common';
import { isPasswordValid } from 'src/shared/utils/password.util';
import { LoginEntity } from '../domain/login.entity';
import { RefreshTokenEntity } from '../domain/refresh-token.entity';

describe('LoginEntity', () => {
  it('should trim and keep identification and password', () => {
    const entity = new LoginEntity({
      identification: '  user@example.com  ',
      password: '  Pa$$w0rd  ',
    });

    expect(entity.identification).toBe('user@example.com');
    expect(entity.password).toBe('Pa$$w0rd');
  });

  it('should accept username or email as identification', () => {
    const emailLogin = new LoginEntity({
      identification: 'user@example.com',
      password: 'Pa$$w0rd',
    });

    const usernameLogin = new LoginEntity({
      identification: 'username',
      password: 'Pa$$w0rd',
    });

    expect(emailLogin.identification).toBe('user@example.com');
    expect(usernameLogin.identification).toBe('username');
  });

  it('should throw BadRequestException when identification is empty after trim', () => {
    expect(
      () =>
        new LoginEntity({
          identification: '   ',
          password: 'Pa$$w0rd',
        }),
    ).toThrow(BadRequestException);

    expect(
      () =>
        new LoginEntity({
          identification: '   ',
          password: 'Pa$$w0rd',
        }),
    ).toThrow('Identification is required');
  });

  it('should throw BadRequestException when password is empty after trim', () => {
    expect(
      () =>
        new LoginEntity({
          identification: 'user@example.com',
          password: '   ',
        }),
    ).toThrow(BadRequestException);

    expect(
      () =>
        new LoginEntity({
          identification: 'user@example.com',
          password: '   ',
        }),
    ).toThrow('Password is required');
  });

  it('should validate email format when identification looks like an email', () => {
    expect(
      () =>
        new LoginEntity({
          identification: 'invalid-email@',
          password: 'Pa$$w0rd',
        }),
    ).toThrow(BadRequestException);

    expect(
      () =>
        new LoginEntity({
          identification: 'invalid-email@',
          password: 'Pa$$w0rd',
        }),
    ).toThrow('Invalid email format');
  });

  it('should not hash password inside entity to keep service responsibility', () => {
    const rawPassword = 'Pa$$w0rd';

    const entity = new LoginEntity({
      identification: 'user@example.com',
      password: rawPassword,
    });

    expect(entity.password).toBe(rawPassword);
    expect(isPasswordValid(rawPassword, entity.password)).toBe(false);
  });
});

describe('RefreshTokenEntity', () => {
  it('should trim and keep refresh token', () => {
    const entity = new RefreshTokenEntity({
      refreshToken: '  refresh-token-value  ',
    });

    expect(entity.refreshToken).toBe('refresh-token-value');
  });

  it('should throw BadRequestException when refresh token is empty after trim', () => {
    expect(
      () =>
        new RefreshTokenEntity({
          refreshToken: '   ',
        }),
    ).toThrow(BadRequestException);

    expect(
      () =>
        new RefreshTokenEntity({
          refreshToken: '   ',
        }),
    ).toThrow('Refresh token is required');
  });
});
