import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import jwt from 'jsonwebtoken';
import { RedisService } from 'src/infra/redis/app/redis.service';
import { JwtService } from '../app/jwt.service';
import { GenerateTokenInput, OnlineSessionEntry, RefreshSessionEntry, BlackListEntry, JwtPayload } from '../types/interface/jwt.interface';

jest.mock('jsonwebtoken');

describe('JwtService', (): void => {
  let service: JwtService;
  let configService: { get: jest.Mock };
  let redisService: jest.Mocked<RedisService>;

  const mockSecret = 'test-secret';

  beforeEach(async (): Promise<void> => {
    configService = {
      get: jest.fn((key: string): string | undefined => {
        if (key === 'JWT_SECRET') {
          return mockSecret;
        }
        return undefined;
      }),
    };

    redisService = {
      setJson: jest.fn(),
      getJson: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    (jwt.sign as jest.Mock).mockReset();
    (jwt.verify as jest.Mock).mockReset();
    (jwt.decode as jest.Mock).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtService, { provide: ConfigService, useValue: configService }, { provide: RedisService, useValue: redisService }],
    }).compile();

    service = module.get(JwtService);
  });

  describe('constructor', (): void => {
    it('should throw when JWT_SECRET is not defined', async (): Promise<void> => {
      const badConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      expect((): JwtService => new JwtService(badConfig, redisService)).toThrow('JWT_SECRET must be defined');
    });
  });

  describe('generateToken', (): void => {
    it('should generate access and refresh tokens and store sessions', async (): Promise<void> => {
      (jwt.sign as jest.Mock).mockReturnValue('access-token');

      const input: GenerateTokenInput = {
        id: 'user-1',
        name: 'User',
        email: 'user@example.com',
        roles: ['admin'],
      };

      const result = await service.generateToken(input);

      expect(result.accessToken).toBe('access-token');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken).toHaveLength(64);

      expect(redisService.setJson).toHaveBeenCalledTimes(2);
      expect(redisService.setJson).toHaveBeenCalledWith(
        expect.stringContaining('online-session:user-1'),
        expect.objectContaining({
          userId: 'user-1',
          accessToken: 'access-token',
          refreshToken: result.refreshToken,
        }),
        expect.any(Number),
      );
      expect(redisService.setJson).toHaveBeenCalledWith(
        expect.stringContaining('refresh-session:'),
        expect.objectContaining({
          userId: 'user-1',
          accessToken: 'access-token',
          refreshToken: result.refreshToken,
        }),
        expect.any(Number),
      );
    });
  });

  describe('validateToken', (): void => {
    it('should validate token, session and return payload', async (): Promise<void> => {
      const payload: JwtPayload = {
        sub: 'user-1',
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
        sessionStart: Math.floor(Date.now() / 1000),
      };

      (jwt.verify as jest.Mock).mockReturnValue(payload);
      redisService.getJson.mockResolvedValueOnce(null).mockResolvedValueOnce({
        userId: 'user-1',
        accessToken: 'token',
        refreshToken: 'refresh',
        sessionStart: payload.sessionStart,
        expiresAt: Date.now() + 1000,
        name: payload.name,
        email: payload.email,
        roles: payload.roles,
      } as OnlineSessionEntry);

      const result = await service.validateToken('token');

      expect(result).toEqual(payload);
    });

    it('should throw when session not found', async (): Promise<void> => {
      const payload: JwtPayload = {
        sub: 'user-1',
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
        iat: 1,
        exp: 2,
        sessionStart: 1,
      };
      (jwt.verify as jest.Mock).mockReturnValue(payload);
      redisService.getJson.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await expect(service.validateToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when token does not match session token', async (): Promise<void> => {
      const payload: JwtPayload = {
        sub: 'user-1',
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
        iat: 1,
        exp: 2,
        sessionStart: 1,
      };
      (jwt.verify as jest.Mock).mockReturnValue(payload);
      redisService.getJson.mockResolvedValueOnce(null).mockResolvedValueOnce({
        userId: 'user-1',
        accessToken: 'other-token',
        refreshToken: 'refresh',
        sessionStart: payload.sessionStart,
        expiresAt: Date.now() + 1000,
        name: payload.name,
        email: payload.email,
        roles: payload.roles,
      } as OnlineSessionEntry);

      await expect(service.validateToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when session is expired', async (): Promise<void> => {
      const payload: JwtPayload = {
        sub: 'user-1',
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
        iat: 1,
        exp: 2,
        sessionStart: 1,
      };
      (jwt.verify as jest.Mock).mockReturnValue(payload);
      redisService.getJson.mockResolvedValueOnce(null).mockResolvedValueOnce({
        userId: 'user-1',
        accessToken: 'token',
        refreshToken: 'refresh',
        sessionStart: payload.sessionStart,
        expiresAt: Date.now() - 1000,
        name: payload.name,
        email: payload.email,
        roles: payload.roles,
      } as OnlineSessionEntry);

      await expect(service.validateToken('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('invalidToken', (): void => {
    it('should do nothing when token is empty', async (): Promise<void> => {
      await service.invalidToken('');

      expect(redisService.setJson).not.toHaveBeenCalled();
    });

    it('should add token to blacklist and remove sessions', async (): Promise<void> => {
      const payload: Partial<JwtPayload> = {
        sub: 'user-1',
        exp: Math.floor(Date.now() / 1000) + 300,
      };
      (jwt.decode as jest.Mock).mockReturnValue(payload);

      const onlineSession: OnlineSessionEntry = {
        userId: 'user-1',
        accessToken: 'token',
        refreshToken: 'refresh',
        sessionStart: payload.exp ?? 0,
        expiresAt: Date.now() + 1000,
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
      };
      redisService.getJson.mockResolvedValueOnce(onlineSession);

      await service.invalidToken('token');

      expect(redisService.setJson).toHaveBeenCalledWith(
        expect.stringContaining('black-list:token'),
        expect.objectContaining<BlackListEntry>({
          accessToken: 'token',
        }),
        expect.any(Number),
      );
      expect(redisService.delete).toHaveBeenCalledWith(expect.stringContaining('online-session:user-1'));
      expect(redisService.delete).toHaveBeenCalledWith(expect.stringContaining('refresh-session:refresh'));
    });
  });

  describe('refreshToken', (): void => {
    it('should throw when refresh token is empty', async (): Promise<void> => {
      await expect(service.refreshToken('')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when refresh session not found', async (): Promise<void> => {
      redisService.getJson.mockResolvedValueOnce(null);

      await expect(service.refreshToken('refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when refresh token expired', async (): Promise<void> => {
      const refreshSession: RefreshSessionEntry = {
        userId: 'user-1',
        accessToken: 'token',
        sessionStart: Math.floor(Date.now() / 1000),
        expiresAt: Date.now() - 1000,
        refreshToken: 'refresh',
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
      };
      redisService.getJson.mockResolvedValueOnce(refreshSession);

      await expect(service.refreshToken('refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when session not found for refresh', async (): Promise<void> => {
      const refreshSession: RefreshSessionEntry = {
        userId: 'user-1',
        accessToken: 'token',
        sessionStart: Math.floor(Date.now() / 1000),
        expiresAt: Date.now() + 1000,
        refreshToken: 'refresh',
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
      };
      redisService.getJson.mockResolvedValueOnce(refreshSession).mockResolvedValueOnce(null);

      await expect(service.refreshToken('refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when refresh token does not belong to session', async (): Promise<void> => {
      const refreshSession: RefreshSessionEntry = {
        userId: 'user-1',
        accessToken: 'token',
        sessionStart: Math.floor(Date.now() / 1000),
        expiresAt: Date.now() + 1000,
        refreshToken: 'refresh',
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
      };
      const onlineSession: OnlineSessionEntry = {
        userId: 'user-1',
        accessToken: 'token',
        refreshToken: 'other-refresh',
        sessionStart: refreshSession.sessionStart,
        expiresAt: Date.now() + 1000,
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
      };
      redisService.getJson.mockResolvedValueOnce(refreshSession).mockResolvedValueOnce(null).mockResolvedValueOnce(onlineSession);

      await expect(service.refreshToken('refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('should refresh token successfully', async (): Promise<void> => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const refreshSession: RefreshSessionEntry = {
        userId: 'user-1',
        accessToken: 'old-access',
        sessionStart: nowSeconds,
        expiresAt: Date.now() + 60_000,
        refreshToken: 'refresh',
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
      };
      const onlineSession: OnlineSessionEntry = {
        userId: 'user-1',
        accessToken: 'old-access',
        refreshToken: 'refresh',
        sessionStart: refreshSession.sessionStart,
        expiresAt: Date.now() + 60_000,
        name: 'User',
        email: 'user@example.com',
        roles: ['user'],
      };

      redisService.getJson.mockResolvedValueOnce(refreshSession).mockResolvedValueOnce(null).mockResolvedValueOnce(onlineSession);

      (jwt.sign as jest.Mock).mockReturnValue('new-access');

      const result = await service.refreshToken('refresh');

      expect(result.accessToken).toBe('new-access');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken).toHaveLength(64);
      expect(redisService.setJson).toHaveBeenCalledTimes(3);
    });
  });
});
