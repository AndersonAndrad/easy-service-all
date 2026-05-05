import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Roles } from '../enums/roles.enum';
import { ROLES_METADATA_KEY } from './roles.decorator';

type AuthContext = {
  userId: string;
  roles: Roles[];
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Roles[]>(ROLES_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const auth = request.auth as AuthContext | undefined;

    if (!auth?.roles) throw new ForbiddenException('Missing auth roles');

    const hasRole = requiredRoles.some((required) => auth.roles.includes(required));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient roles');
    }

    return true;
  }
}
