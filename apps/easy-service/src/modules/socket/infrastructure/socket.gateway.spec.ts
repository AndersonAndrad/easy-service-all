import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from 'src/infra/auth/jwt/app/jwt.service';
import type { WorkspaceRepository } from 'src/modules/workspace/types/repository/workspace.repository';

import { SocketAuthenticatedPresenceService } from '../app/socket-authenticated-presence.service';
import { SocketService } from '../app/socket.service';
import { SOCKET_SESSION_AUTHENTICATED, SOCKET_SESSION_DISCONNECTED, SOCKET_SESSION_ERROR, SOCKET_SESSION_RECONNECTED } from '../socket.constants';
import type { SocketSessionClientData } from '../types/socket-session.types';
import { SocketGateway } from './socket.gateway';

type MockClient = {
  id: string;
  data: SocketSessionClientData;
  join: jest.Mock;
  leave: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
};

function createMockClient(): MockClient {
  return {
    id: 'socket-1',
    data: {},
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe('SocketGateway', (): void => {
  let gateway: SocketGateway;
  let socketService: jest.Mocked<Pick<SocketService, 'attachServer' | 'dispatchIncoming'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'validateToken'>>;
  let presence: jest.Mocked<Pick<SocketAuthenticatedPresenceService, 'addAuthenticatedSocket' | 'removeAuthenticatedSocket' | 'hasAuthenticatedSocket'>>;
  let workspaceRepository: jest.Mocked<Pick<WorkspaceRepository, 'findById'>>;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach((): void => {
    socketService = {
      attachServer: jest.fn(),
      dispatchIncoming: jest.fn(),
    };
    jwtService = {
      validateToken: jest.fn(),
    };
    presence = {
      addAuthenticatedSocket: jest.fn(),
      removeAuthenticatedSocket: jest.fn(),
      hasAuthenticatedSocket: jest.fn(),
    };
    workspaceRepository = {
      findById: jest.fn(),
    };
    gateway = new SocketGateway(socketService as unknown as SocketService, jwtService as unknown as JwtService, presence as unknown as SocketAuthenticatedPresenceService, workspaceRepository as unknown as WorkspaceRepository);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation((): void => {});
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation((): void => {});
  });

  afterEach((): void => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  describe('handleSessionAuthenticate', (): void => {
    it('should emit error, disconnected, and disconnect when token is missing', async (): Promise<void> => {
      const client = createMockClient();

      await gateway.handleSessionAuthenticate(client as never, {});

      expect(client.emit).toHaveBeenCalledWith(SOCKET_SESSION_ERROR, {
        code: 'INVALID_TOKEN',
        message: 'Token is required',
      });
      expect(client.emit).toHaveBeenCalledWith(SOCKET_SESSION_DISCONNECTED, { reason: 'invalid_token' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(jwtService.validateToken).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('Session handshake undone (rejected) socketId=socket-1 cause=missing_token userId=none');
    });

    it('should emit authenticated and join user room when token is valid', async (): Promise<void> => {
      const client = createMockClient();
      jwtService.validateToken.mockResolvedValue({
        sub: 'user-1',
        name: 'n',
        email: 'e',
        roles: [],
        iat: 1,
        exp: 2,
        sessionStart: 1,
      });

      await gateway.handleSessionAuthenticate(client as never, { token: '  jwt  ' });

      expect(jwtService.validateToken).toHaveBeenCalledWith('jwt');
      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.data.userId).toBe('user-1');
      expect(client.data.roles).toEqual([]);
      expect(client.emit).toHaveBeenCalledWith(SOCKET_SESSION_AUTHENTICATED, { userId: 'user-1' });
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Session handshake completed userId=user-1 socketId=socket-1 reconnecting=false');
      expect(presence.addAuthenticatedSocket).toHaveBeenCalledWith('user-1');
    });

    it('should emit reconnected when reconnecting flag is true', async (): Promise<void> => {
      const client = createMockClient();
      jwtService.validateToken.mockResolvedValue({
        sub: 'user-1',
        name: 'n',
        email: 'e',
        roles: [],
        iat: 1,
        exp: 2,
        sessionStart: 1,
      });

      await gateway.handleSessionAuthenticate(client as never, { token: 'jwt', reconnecting: true });

      expect(client.emit).toHaveBeenCalledWith(SOCKET_SESSION_RECONNECTED, { userId: 'user-1' });
      expect(logSpy).toHaveBeenCalledWith('Session handshake completed userId=user-1 socketId=socket-1 reconnecting=true');
    });

    it('should emit error and disconnect when validateToken fails', async (): Promise<void> => {
      const client = createMockClient();
      jwtService.validateToken.mockRejectedValue(new UnauthorizedException('Session not found'));

      await gateway.handleSessionAuthenticate(client as never, { token: 'bad' });

      expect(client.emit).toHaveBeenCalledWith(SOCKET_SESSION_ERROR, {
        code: 'UNAUTHORIZED',
        message: 'Session not found',
      });
      expect(client.emit).toHaveBeenCalledWith(SOCKET_SESSION_DISCONNECTED, { reason: 'unauthorized' });
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(warnSpy).toHaveBeenCalledWith('Session handshake undone (rejected) socketId=socket-1 cause=invalid_or_expired_token userId=none message=Session not found');
    });
  });

  describe('handleDisconnect', (): void => {
    it('should log authenticated session teardown with userId', (): void => {
      const client = createMockClient();
      client.data.userId = 'user-1';

      gateway.handleDisconnect(client as never);

      expect(presence.removeAuthenticatedSocket).toHaveBeenCalledWith('user-1');
      expect(logSpy).toHaveBeenCalledWith('Session handshake undone userId=user-1 socketId=socket-1 (socket disconnected)');
    });

    it('should log when socket drops before handshake', (): void => {
      const client = createMockClient();

      gateway.handleDisconnect(client as never);

      expect(logSpy).toHaveBeenCalledWith('Socket disconnected before handshake completed socketId=socket-1');
    });
  });

  describe('handleSubscribe', (): void => {
    it('should reject when socket is not authenticated', (): void => {
      const client = createMockClient();

      gateway.handleSubscribe(client as never, { topic: 'orders' });

      expect(client.join).not.toHaveBeenCalled();
    });

    it('should join topic when authenticated', (): void => {
      const client = createMockClient();
      client.data.userId = 'u1';

      gateway.handleSubscribe(client as never, { topic: 'orders' });

      expect(client.join).toHaveBeenCalledWith('orders');
    });

    it('should reject subscribe to another user private room', (): void => {
      const client = createMockClient();
      client.data.userId = 'u1';

      gateway.handleSubscribe(client as never, { topic: 'user:other' });

      expect(client.join).not.toHaveBeenCalled();
    });

    it('should allow subscribe to own user room', (): void => {
      const client = createMockClient();
      client.data.userId = 'u1';

      gateway.handleSubscribe(client as never, { topic: 'user:u1' });

      expect(client.join).toHaveBeenCalledWith('user:u1');
    });
  });

  describe('handleWorkspaceJoin', (): void => {
    it('should reject when socket is not authenticated', async (): Promise<void> => {
      const client = createMockClient();

      await gateway.handleWorkspaceJoin(client as never, { workspaceId: 'ws-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('workspace:join rejected: unauthenticated socketId=socket-1');
    });

    it('should reject when workspaceId is missing', async (): Promise<void> => {
      const client = createMockClient();
      client.data.userId = 'u1';

      await gateway.handleWorkspaceJoin(client as never, {});

      expect(client.join).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('workspace:join rejected: invalid workspaceId socketId=socket-1');
    });

    it('should reject when workspace not found', async (): Promise<void> => {
      const client = createMockClient();
      client.data.userId = 'u1';
      client.data.roles = [];
      workspaceRepository.findById.mockResolvedValue(null);

      await gateway.handleWorkspaceJoin(client as never, { workspaceId: 'ws-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('workspace:join rejected: forbidden workspaceId=ws-1 socketId=socket-1');
    });

    it('should reject when user is not owner', async (): Promise<void> => {
      const client = createMockClient();
      client.data.userId = 'u1';
      client.data.roles = [];
      workspaceRepository.findById.mockResolvedValue({
        id: 'ws-1',
        name: 'W',
        userOwnerId: 'other',
        customInterface: { color: '#000' },
        isActive: true,
        createdAt: 1,
        updatedAt: 1,
      });

      await gateway.handleWorkspaceJoin(client as never, { workspaceId: 'ws-1' });

      expect(client.join).not.toHaveBeenCalled();
    });

    it('should join room when user owns workspace', async (): Promise<void> => {
      const client = createMockClient();
      client.data.userId = 'u1';
      client.data.roles = [];
      workspaceRepository.findById.mockResolvedValue({
        id: 'ws-1',
        name: 'W',
        userOwnerId: 'u1',
        customInterface: { color: '#000' },
        isActive: true,
        createdAt: 1,
        updatedAt: 1,
      });

      await gateway.handleWorkspaceJoin(client as never, { workspaceId: 'ws-1' });

      expect(client.join).toHaveBeenCalledWith('ws-1');
      expect(logSpy).toHaveBeenCalledWith('User joined workspace room workspaceId=ws-1 userId=u1 socketId=socket-1');
    });

    it('should join when super_admin regardless of owner', async (): Promise<void> => {
      const client = createMockClient();
      client.data.userId = 'u1';
      client.data.roles = ['super_admin'];
      workspaceRepository.findById.mockResolvedValue({
        id: 'ws-1',
        name: 'W',
        userOwnerId: 'other',
        customInterface: { color: '#000' },
        isActive: true,
        createdAt: 1,
        updatedAt: 1,
      });

      await gateway.handleWorkspaceJoin(client as never, { workspaceId: 'ws-1' });

      expect(client.join).toHaveBeenCalledWith('ws-1');
    });
  });

  describe('handleWorkspaceLeave', (): void => {
    it('should reject when not authenticated', async (): Promise<void> => {
      const client = createMockClient();

      await gateway.handleWorkspaceLeave(client as never, { workspaceId: 'ws-1' });

      expect(client.leave).not.toHaveBeenCalled();
    });

    it('should leave when user may access workspace', async (): Promise<void> => {
      const client = createMockClient();
      client.data.userId = 'u1';
      client.data.roles = [];
      workspaceRepository.findById.mockResolvedValue({
        id: 'ws-1',
        name: 'W',
        userOwnerId: 'u1',
        customInterface: { color: '#000' },
        isActive: true,
        createdAt: 1,
        updatedAt: 1,
      });

      await gateway.handleWorkspaceLeave(client as never, { workspaceId: 'ws-1' });

      expect(client.leave).toHaveBeenCalledWith('ws-1');
      expect(logSpy).toHaveBeenCalledWith('User left workspace room workspaceId=ws-1 userId=u1 socketId=socket-1');
    });
  });

  describe('handlePublish', (): void => {
    it('should reject when socket is not authenticated', (): void => {
      const client = createMockClient();

      gateway.handlePublish(client as never, { topic: 't', payload: { x: 1 } });

      expect(socketService.dispatchIncoming).not.toHaveBeenCalled();
    });

    it('should dispatch when authenticated', (): void => {
      const client = createMockClient();
      client.data.userId = 'u1';

      gateway.handlePublish(client as never, { topic: 't', payload: { x: 1 } });

      expect(socketService.dispatchIncoming).toHaveBeenCalledWith('t', { x: 1 });
    });
  });
});
