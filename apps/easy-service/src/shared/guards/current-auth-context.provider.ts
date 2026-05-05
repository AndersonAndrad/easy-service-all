import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Roles } from '../enums/roles.enum';

type AuthContext = {
  userId: string;
  roles: Roles[];
};

@Injectable({ scope: Scope.REQUEST })
export class CurrentAuthContextProvider {
  constructor(@Inject(REQUEST) private readonly request: { auth?: AuthContext }) {}

  getAuthContext(): AuthContext {
    const auth = this.request.auth;
    if (!auth) {
      throw new UnauthorizedException('Missing auth context');
    }

    return auth as AuthContext;
  }
}
