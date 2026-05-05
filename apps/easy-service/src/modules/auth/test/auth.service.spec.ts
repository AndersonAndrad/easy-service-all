import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from 'src/infra/auth/jwt/app/jwt.service';
import { hashPassword } from '../../../shared/utils/password.util';
import { UserService } from '../../user/app/user.service';
import type { User } from '../../user/types/interface/user.interface';
import { SocketService } from 'src/modules/socket/app/socket.service';
import { AuthService } from '../app/auth.service';

type MockedUserService = jest.Mocked<UserService>;
type MockedJwtService = jest.Mocked<JwtService>;
type MockedSocketService = jest.Mocked<Pick<SocketService, 'disconnectUserSockets'>>;

const createUser = (overrides: Partial<User> = {}): User => {
  const base: User = {
    _id: '65f1aabbccddeeff00112233',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    email: 'user@example.com',
    cnpj: '12345678000199',
    name: 'User Name',
    userName: 'username',
    password: hashPassword('valid-password'),
    roles: ['user'],
  };

  return { ...base, ...overrides };
};

const createUserServiceMock = (): MockedUserService =>
  ({
    create: jest.fn(),
    findById: jest.fn(),
    findByEmailOrUserName: jest.fn(),
    update: jest.fn(),
  }) as unknown as MockedUserService;

const createJwtServiceMock = (): MockedJwtService =>
  ({
    generateToken: jest.fn(),
    invalidToken: jest.fn(),
    refreshToken: jest.fn(),
    validateToken: jest.fn(),
  }) as unknown as MockedJwtService;

const createSocketServiceMock = (): MockedSocketService =>
  ({
    disconnectUserSockets: jest.fn(),
  }) as unknown as MockedSocketService;

describe('AuthService', (): void => {
  let authService: AuthService;
  let userService: MockedUserService;
  let jwtService: MockedJwtService;
  let socketService: MockedSocketService;

  beforeEach((): void => {
    userService = createUserServiceMock();
    jwtService = createJwtServiceMock();
    socketService = createSocketServiceMock();
    authService = new AuthService(userService, jwtService, socketService as unknown as SocketService);
  });

  describe('login', (): void => {
    it('should return an access token when credentials are valid using username', async (): Promise<void> => {
      const user = createUser();
      userService.findByEmailOrUserName.mockResolvedValue(user);
      jwtService.generateToken.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.login('username', 'valid-password');

      expect(userService.findByEmailOrUserName).toHaveBeenCalledWith('username');
      expect(jwtService.generateToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('should return an access token when credentials are valid using email', async (): Promise<void> => {
      const user = createUser({ email: 'user@example.com', userName: 'user.name' });
      userService.findByEmailOrUserName.mockResolvedValue(user);
      jwtService.generateToken.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.login('user@example.com', 'valid-password');

      expect(userService.findByEmailOrUserName).toHaveBeenCalledWith('user@example.com');
      expect(jwtService.generateToken).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('should throw UnauthorizedException when password is invalid', async (): Promise<void> => {
      const user = createUser();
      userService.findByEmailOrUserName.mockResolvedValue(user);

      await expect(authService.login('username', 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(authService.login('username', 'wrong-password')).rejects.toThrow('Invalid credentials');
      expect(jwtService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not found', async (): Promise<void> => {
      userService.findByEmailOrUserName.mockResolvedValue(null);

      await expect(authService.login('missing-user', 'any-password')).rejects.toBeInstanceOf(NotFoundException);
      await expect(authService.login('missing-user', 'any-password')).rejects.toThrow('User not found');
      expect(jwtService.generateToken).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when identifier looks like an invalid email', async (): Promise<void> => {
      await expect(authService.login('invalid-email@', 'any-password')).rejects.toBeInstanceOf(BadRequestException);
      await expect(authService.login('invalid-email@', 'any-password')).rejects.toThrow('Invalid email format');
      expect(userService.findByEmailOrUserName).not.toHaveBeenCalled();
      expect(jwtService.generateToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', (): void => {
    it('should invalidate the access token successfully', async (): Promise<void> => {
      jwtService.validateToken.mockRejectedValue(new UnauthorizedException('invalid'));
      jwtService.invalidToken.mockResolvedValue(undefined);

      await expect(authService.logout('access-token')).resolves.toBeUndefined();
      expect(jwtService.validateToken).toHaveBeenCalledWith('access-token');
      expect(jwtService.invalidToken).toHaveBeenCalledWith('access-token');
      expect(socketService.disconnectUserSockets).not.toHaveBeenCalled();
    });

    it('should disconnect socket sessions before invalidating when token is valid', async (): Promise<void> => {
      jwtService.validateToken.mockResolvedValue({
        sub: 'user-id',
        name: 'n',
        email: 'e',
        roles: [],
        iat: 1,
        exp: 2,
        sessionStart: 1,
      });
      jwtService.invalidToken.mockResolvedValue(undefined);

      await expect(authService.logout('Bearer jwt-token')).resolves.toBeUndefined();

      expect(jwtService.validateToken).toHaveBeenCalledWith('jwt-token');
      expect(socketService.disconnectUserSockets).toHaveBeenCalledWith('user-id');
      expect(jwtService.invalidToken).toHaveBeenCalledWith('jwt-token');
    });

    it('should resolve when access token is empty (no-op invalidation)', async (): Promise<void> => {
      jwtService.invalidToken.mockResolvedValue(undefined);

      await expect(authService.logout('')).resolves.toBeUndefined();
      expect(jwtService.validateToken).not.toHaveBeenCalled();
      expect(jwtService.invalidToken).toHaveBeenCalledWith('');
    });
  });

  describe('refreshToken', (): void => {
    it('should return a new access token when refresh token is valid', async (): Promise<void> => {
      jwtService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await authService.refreshToken('valid-refresh-token');

      expect(jwtService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async (): Promise<void> => {
      jwtService.refreshToken.mockRejectedValue(new Error('invalid token'));

      await expect(authService.refreshToken('invalid-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(authService.refreshToken('invalid-refresh-token')).rejects.toThrow('Invalid refresh token');
      expect(jwtService.refreshToken).toHaveBeenCalledWith('invalid-refresh-token');
    });
  });
});
