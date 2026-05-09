import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { JwtService } from 'src/infra/auth/jwt/app/jwt.service';
import { WORKSPACE_REPOSITORY, type WorkspaceRepository } from 'src/modules/workspace/types/repository/workspace.repository';
import { Roles } from 'src/shared/enums/roles.enum';

import { SocketAuthenticatedPresenceService } from '../app/socket-authenticated-presence.service';
import { SocketService } from '../app/socket.service';
import {
  getConversationRoom,
  getSocketUserRoom,
  SOCKET_CHAT_JOIN_CONVERSATION,
  SOCKET_CHAT_LEAVE_CONVERSATION,
  SOCKET_CHAT_MARK_AS_READ,
  SOCKET_CHAT_READ_MESSAGE,
  SOCKET_CHAT_SEND_MESSAGE,
  SOCKET_PUBLISH_MESSAGE,
  SOCKET_SESSION_AUTHENTICATE,
  SOCKET_SESSION_AUTHENTICATED,
  SOCKET_SESSION_DISCONNECTED,
  SOCKET_SESSION_ERROR,
  SOCKET_SESSION_RECONNECTED,
  SOCKET_SUBSCRIBE_MESSAGE,
  SOCKET_USER_ROOM_PREFIX,
  SOCKET_WORKSPACE_JOIN,
  SOCKET_WORKSPACE_LEAVE,
} from '../socket.constants';
import type { SessionAuthenticateBody, SessionDisconnectedPayload, SessionErrorPayload, SocketSessionClientData, WorkspaceRoomBody } from '../types/socket-session.types';

type SubscribeBody = { topic?: unknown };
type PublishBody = { topic?: unknown; payload?: unknown };
type ReadMessageBody = { conversationKey?: unknown; messageId?: unknown };
type SendMessageBody = { conversationKey?: unknown; workspaceId?: unknown; type?: unknown; payload?: { text?: unknown } };

const SESSION_ERROR_INVALID_TOKEN = 'INVALID_TOKEN' as const;
const SESSION_ERROR_UNAUTHORIZED = 'UNAUTHORIZED' as const;
const DISCONNECT_REASON_INVALID_TOKEN = 'invalid_token' as const;
const DISCONNECT_REASON_UNAUTHORIZED = 'unauthorized' as const;

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(SocketGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketService: SocketService,
    private readonly jwtService: JwtService,
    private readonly socketPresence: SocketAuthenticatedPresenceService,
    @Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepository: WorkspaceRepository,
  ) {}

  afterInit(): void {
    this.socketService.attachServer(this.server);
  }

  handleDisconnect(client: Socket): void {
    const sessionData = client.data as SocketSessionClientData;
    const userId = sessionData.userId;
    if (typeof userId === 'string' && userId.trim().length > 0) {
      this.socketPresence.removeAuthenticatedSocket(userId);
      this.logger.log(`Session handshake undone userId=${userId} socketId=${client.id} (socket disconnected)`);
      return;
    }
    this.logger.log(`Socket disconnected before handshake completed socketId=${client.id}`);
  }

  @SubscribeMessage(SOCKET_SESSION_AUTHENTICATE)
  async handleSessionAuthenticate(@ConnectedSocket() client: Socket, @MessageBody() body: SessionAuthenticateBody): Promise<void> {
    const sessionData = client.data as SocketSessionClientData;
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const reconnecting = body?.reconnecting === true;

    if (!token) {
      this.emitSessionError(client, SESSION_ERROR_INVALID_TOKEN, 'Token is required');
      this.emitSessionDisconnected(client, DISCONNECT_REASON_INVALID_TOKEN);
      this.logger.warn(`Session handshake undone (rejected) socketId=${client.id} cause=missing_token userId=none`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.validateToken(token);
      const userId = payload.sub;
      sessionData.userId = userId;
      sessionData.roles = payload.roles ?? [];
      const room = getSocketUserRoom(userId);
      await client.join(room);
      this.socketPresence.addAuthenticatedSocket(userId);

      const ackPayload = { userId };
      if (reconnecting) {
        client.emit(SOCKET_SESSION_RECONNECTED, ackPayload);
      } else {
        client.emit(SOCKET_SESSION_AUTHENTICATED, ackPayload);
      }
      this.logger.log(`Session handshake completed userId=${userId} socketId=${client.id} reconnecting=${reconnecting}`);
    } catch (error: unknown) {
      const message = error instanceof UnauthorizedException ? error.message : 'Authentication failed';
      this.logger.warn(`Session handshake undone (rejected) socketId=${client.id} cause=invalid_or_expired_token userId=none message=${message}`);
      this.emitSessionError(client, SESSION_ERROR_UNAUTHORIZED, message);
      this.emitSessionDisconnected(client, DISCONNECT_REASON_UNAUTHORIZED);
      client.disconnect(true);
    }
  }

  @SubscribeMessage(SOCKET_SUBSCRIBE_MESSAGE)
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribeBody): void {
    if (!this.isSocketAuthenticated(client)) {
      this.logger.warn(`subscribe rejected: \n unauthenticated \n socketId=${client.id}`);
      return;
    }
    const topic = body?.topic;
    if (typeof topic !== 'string' || topic.trim().length === 0) {
      this.logger.warn('subscribe rejected: \n invalid topic');
      return;
    }
    const normalizedTopic = topic.trim();
    const userId = (client.data as SocketSessionClientData).userId as string;
    if (normalizedTopic.startsWith(SOCKET_USER_ROOM_PREFIX) && normalizedTopic !== getSocketUserRoom(userId)) {
      this.logger.warn(`subscribe rejected: \n forbidden user room \n socketId=${client.id}`);
      return;
    }
    void client.join(normalizedTopic);
  }

  @SubscribeMessage(SOCKET_WORKSPACE_JOIN)
  async handleWorkspaceJoin(@ConnectedSocket() client: Socket, @MessageBody() body: WorkspaceRoomBody): Promise<void> {
    if (!this.isSocketAuthenticated(client)) {
      this.logger.warn(`workspace:join rejected: \n unauthenticated \n socketId=${client.id}`);
      return;
    }
    const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId.trim() : '';
    if (!workspaceId) {
      this.logger.warn(`workspace:join rejected: \n invalid workspaceId \n socketId=${client.id}`);
      return;
    }
    const sessionData = client.data as SocketSessionClientData;
    const allowed = await this.userMayAccessWorkspace(sessionData.userId as string, sessionData.roles ?? [], workspaceId);
    if (!allowed) {
      this.logger.warn(`workspace:join rejected: \n forbidden workspaceId=${workspaceId} \n socketId=${client.id}`);
      return;
    }
    await client.join(workspaceId);
    this.logger.log(`User joined workspace room: \n workspaceId=${workspaceId} \n userId=${sessionData.userId} \n socketId=${client.id}`);
    this.socketService.replayPendingQrToSocket(workspaceId, client.id);
  }

  @SubscribeMessage(SOCKET_WORKSPACE_LEAVE)
  async handleWorkspaceLeave(@ConnectedSocket() client: Socket, @MessageBody() body: WorkspaceRoomBody): Promise<void> {
    if (!this.isSocketAuthenticated(client)) {
      this.logger.warn(`workspace:leave rejected: unauthenticated socketId=${client.id}`);
      return;
    }
    const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId.trim() : '';
    if (!workspaceId) {
      this.logger.warn(`workspace:leave rejected: invalid workspaceId socketId=${client.id}`);
      return;
    }
    const sessionData = client.data as SocketSessionClientData;
    const allowed = await this.userMayAccessWorkspace(sessionData.userId as string, sessionData.roles ?? [], workspaceId);
    if (!allowed) {
      this.logger.warn(`workspace:leave rejected: forbidden workspaceId=${workspaceId} socketId=${client.id}`);
      return;
    }
    await client.leave(workspaceId);
    this.logger.log(`User left workspace room workspaceId=${workspaceId} userId=${sessionData.userId} socketId=${client.id}`);
  }

  @SubscribeMessage(SOCKET_CHAT_JOIN_CONVERSATION)
  async handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId?: unknown }): Promise<void> {
    if (!this.isSocketAuthenticated(client)) {
      this.logger.warn(`JOIN_CONVERSATION rejected: unauthenticated socketId=${client.id}`);
      return;
    }
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
    if (!conversationId) {
      this.logger.warn(`JOIN_CONVERSATION rejected: missing conversationId socketId=${client.id}`);
      return;
    }
    await client.join(getConversationRoom(conversationId));
    this.logger.log(`Socket joined conversation room conversationId=${conversationId} socketId=${client.id}`);
  }

  @SubscribeMessage(SOCKET_CHAT_LEAVE_CONVERSATION)
  async handleLeaveConversation(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId?: unknown }): Promise<void> {
    if (!this.isSocketAuthenticated(client)) return;
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
    if (!conversationId) return;
    await client.leave(getConversationRoom(conversationId));
    this.logger.log(`Socket left conversation room conversationId=${conversationId} socketId=${client.id}`);
  }

  @SubscribeMessage(SOCKET_CHAT_MARK_AS_READ)
  handleMarkAsRead(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId?: unknown }): void {
    if (!this.isSocketAuthenticated(client)) return;
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
    if (!conversationId) return;
    this.socketService.dispatchIncoming('MARK_AS_READ', { conversationId });
  }

  @SubscribeMessage(SOCKET_CHAT_READ_MESSAGE)
  handleReadMessage(@ConnectedSocket() client: Socket, @MessageBody() body: ReadMessageBody): void {
    if (!this.isSocketAuthenticated(client)) return;
    const conversationKey = typeof body?.conversationKey === 'string' ? body.conversationKey.trim() : '';
    const messageId = typeof body?.messageId === 'string' ? body.messageId.trim() : '';
    if (!conversationKey || !messageId) {
      this.logger.warn(`read-message rejected: missing conversationKey or messageId socketId=${client.id}`);
      return;
    }
    this.socketService.dispatchIncoming(SOCKET_CHAT_READ_MESSAGE, { conversationKey, messageId });
    this.logger.log(`read-message dispatched conversationKey=${conversationKey} messageId=${messageId} socketId=${client.id}`);
  }

  @SubscribeMessage(SOCKET_CHAT_SEND_MESSAGE)
  handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() body: SendMessageBody): void {
    if (!this.isSocketAuthenticated(client)) {
      this.logger.warn(`send_message rejected: unauthenticated socketId=${client.id}`);
      return;
    }
    const conversationKey = typeof body?.conversationKey === 'string' ? body.conversationKey.trim() : '';
    const text = typeof body?.payload?.text === 'string' ? body.payload.text.trim() : '';
    if (!conversationKey || !text) {
      this.logger.warn(`send_message rejected: missing conversationKey or payload.text socketId=${client.id}`);
      return;
    }
    this.logger.log(`send_message dispatched conversationKey=${conversationKey} socketId=${client.id}`);
    this.socketService.dispatchIncoming(SOCKET_CHAT_SEND_MESSAGE, { conversationKey, text });
  }

  @SubscribeMessage(SOCKET_PUBLISH_MESSAGE)
  handlePublish(@ConnectedSocket() client: Socket, @MessageBody() body: PublishBody): void {
    if (!this.isSocketAuthenticated(client)) {
      this.logger.warn(`publish rejected: \n unauthenticated \n socketId=${client.id}`);
      return;
    }
    const topic = body?.topic;
    if (typeof topic !== 'string' || topic.trim().length === 0) {
      this.logger.warn('publish rejected: \n invalid topic');
      return;
    }
    this.socketService.dispatchIncoming(topic, body?.payload);
  }

  private isSocketAuthenticated(client: Socket): boolean {
    const userId = (client.data as SocketSessionClientData).userId;
    return typeof userId === 'string' && userId.trim().length > 0;
  }

  private async userMayAccessWorkspace(userId: string, roles: string[], workspaceId: string): Promise<boolean> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      return false;
    }
    const isSuperAdmin = roles.includes(Roles.SUPER_ADMIN);
    return isSuperAdmin || workspace.userOwnerId === userId;
  }

  private emitSessionError(client: Socket, code: string, message: string): void {
    const payload: SessionErrorPayload = { code, message };
    client.emit(SOCKET_SESSION_ERROR, payload);
  }

  private emitSessionDisconnected(client: Socket, reason: string): void {
    const payload: SessionDisconnectedPayload = { reason };
    client.emit(SOCKET_SESSION_DISCONNECTED, payload);
  }
}
