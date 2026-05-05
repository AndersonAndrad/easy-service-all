import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { SocketAuthenticatedPresenceService } from 'src/modules/socket/app/socket-authenticated-presence.service';

@Injectable()
export class SocketHandshakeGuard implements CanActivate {
  constructor(private readonly socketPresence: SocketAuthenticatedPresenceService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.auth?.userId as string | undefined;

    if (!userId?.trim()) {
      throw new ForbiddenException('Active authenticated socket session is required');
    }

    if (!this.socketPresence.hasAuthenticatedSocket(userId)) {
      throw new ForbiddenException('Active authenticated socket session is required');
    }

    return true;
  }
}
