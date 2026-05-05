import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../app/auth.service';
import { AuthController } from '../rest/auth.controller';

type MockedAuthService = jest.Mocked<AuthService>;

describe('AuthController', () => {
  let controller: AuthController;
  let service: MockedAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            logout: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService) as MockedAuthService;
  });

  describe('login', () => {
    it('should delegate to AuthService and return access token on success', async () => {
      service.login.mockResolvedValue({ accessToken: 'access-token', refreshToken: 'refresh-token' });

      const result = await controller.login({
        identification: 'username-or-email',
        password: 'password',
      });

      expect(service.login).toHaveBeenCalledWith('username-or-email', 'password');
      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('should propagate UnauthorizedException from AuthService for invalid password', async () => {
      service.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login({ identification: 'username', password: 'wrong-password' })).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(controller.login({ identification: 'username', password: 'wrong-password' })).rejects.toThrow('Invalid credentials');
    });

    it('should propagate NotFoundException from AuthService when user is not found', async () => {
      service.login.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.login({ identification: 'missing-user', password: 'any-password' })).rejects.toBeInstanceOf(NotFoundException);
      await expect(controller.login({ identification: 'missing-user', password: 'any-password' })).rejects.toThrow('User not found');
    });

    it('should propagate BadRequestException when identifier is an invalid email', async () => {
      service.login.mockRejectedValue(new BadRequestException('Invalid email format'));

      await expect(controller.login({ identification: 'invalid-email@', password: 'any' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(controller.login({ identification: 'invalid-email@', password: 'any' })).rejects.toThrow('Invalid email format');
    });
  });

  describe('logout', () => {
    it('should call AuthService.logout with access token and resolve with void', async () => {
      service.logout.mockResolvedValue(undefined);

      const result = await controller.logout('access-token');

      expect(service.logout).toHaveBeenCalledWith('access-token');
      expect(result).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('should delegate to AuthService and return new access token', async () => {
      service.refreshToken.mockResolvedValue({ accessToken: 'new-access-token' });

      const result = await controller.refreshToken({ refreshToken: 'refresh-token' });

      expect(service.refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('should propagate UnauthorizedException when refresh token is invalid', async () => {
      service.refreshToken.mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await expect(controller.refreshToken({ refreshToken: 'invalid-refresh' })).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(controller.refreshToken({ refreshToken: 'invalid-refresh' })).rejects.toThrow('Invalid refresh token');
    });
  });
});
