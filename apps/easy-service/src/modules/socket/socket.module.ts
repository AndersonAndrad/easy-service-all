import { Module } from '@nestjs/common';

import { SocketHandshakeGuard } from 'src/shared/guards/socket-handshake.guard';
import { WorkspacePersistenceModule } from 'src/modules/workspace/workspace-persistence.module';

import { SocketAuthenticatedPresenceService } from './app/socket-authenticated-presence.service';
import { SocketService } from './app/socket.service';
import { SocketGateway } from './infrastructure/socket.gateway';

@Module({
  imports: [WorkspacePersistenceModule],
  providers: [SocketService, SocketGateway, SocketAuthenticatedPresenceService, SocketHandshakeGuard],
  exports: [SocketService, SocketAuthenticatedPresenceService, SocketHandshakeGuard],
})
export class SocketModule {}
