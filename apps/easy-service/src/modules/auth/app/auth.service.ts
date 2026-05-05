import { HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from 'src/infra/auth/jwt/app/jwt.service';
import { SocketService } from 'src/modules/socket/app/socket.service';
import { UserService } from 'src/modules/user/app/user.service';
import { isPasswordValid } from 'src/shared/utils/password.util';
import { LoginEntity } from '../domain/login.entity';
import { RefreshTokenEntity } from '../domain/refresh-token.entity';
import type { TokenPair } from '../types/interface/auth.interface';

function stripAuthorizationBearer(value: string): string {
  const trimmed = value.trim();
  const prefix = 'bearer ';
  if (trimmed.length >= prefix.length && trimmed.slice(0, prefix.length).toLowerCase() === prefix) {
    return trimmed.slice(prefix.length).trim();
  }
  return trimmed;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly socketService: SocketService,
  ) {}

  public async login(identification: string, password: string): Promise<TokenPair> {
    try {
      const login = new LoginEntity({ identification, password });

      this.logger.log(`Starting login process for identifier "${login.identification}"`);

      const user = await this.userService.findByEmailOrUserName(login.identification);

      if (!user) {
        this.logger.error(`User not found for identifier "${login.identification}"`);
        throw new NotFoundException('User not found');
      }

      const isValid = isPasswordValid(login.password, user.password);

      if (!isValid) {
        this.logger.error(`Invalid credentials for user "${user.email}"`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`Generating access-token for user "${user.email}"`);

      return this.jwtService.generateToken({
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      });
    } catch (caught: unknown) {
      if (caught instanceof HttpException) {
        throw caught;
      }

      this.logger.error('Unexpected error during login process', caught instanceof Error ? caught.stack : undefined);
      throw new InternalServerErrorException('Login failed');
    }
  }

  public async logout(accessToken: string): Promise<void> {
    this.logger.log('Starting logout process');

    try {
      const raw = typeof accessToken === 'string' ? accessToken : '';
      const token = stripAuthorizationBearer(raw);
      if (token.length > 0) {
        try {
          const payload = await this.jwtService.validateToken(token);
          this.socketService.disconnectUserSockets(payload.sub);
        } catch {
          // Token invalid or session already gone; still invalidate if possible
        }
      }
      await this.jwtService.invalidToken(token);
      this.logger.log('Logout process finished');
    } catch (caught: unknown) {
      if (caught instanceof HttpException) {
        throw caught;
      }
      this.logger.error('Unexpected error during logout process', caught instanceof Error ? caught.stack : undefined);
      throw new InternalServerErrorException('Logout failed');
    }
  }

  public async refreshToken(refreshToken: string): Promise<TokenPair> {
    const refreshEntity = new RefreshTokenEntity({ refreshToken });

    this.logger.log('Starting refresh-token process');

    try {
      const tokens = await this.jwtService.refreshToken(refreshEntity.refreshToken);

      this.logger.log('New access-token generated from refresh-token');

      return tokens;
    } catch (caught: unknown) {
      this.logger.error('Error while refreshing token', caught instanceof Error ? caught.stack : undefined);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
