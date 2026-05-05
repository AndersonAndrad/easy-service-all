import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from 'src/infra/auth/jwt/app/jwt.service';

type AuthContext = {
  userId: string;
  roles: string[];
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    // kept to support future decorator-based behavior
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string | undefined;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader;

    const payload = await this.jwtService.validateToken(token);

    const authContext: AuthContext = {
      userId: payload.sub,
      roles: payload.roles,
    };

    request.auth = authContext;
    return true;
  }
}
