import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

import { getSocketUserRoom } from '../socket.constants';
import type { GenericSocket, SocketTopicListener } from '../types/interface/generic-socket.interface';

type PendingQrEntry = { qr: string; deadlineMs: number | null };

@Injectable()
export class SocketService implements GenericSocket {
  private readonly logger = new Logger(SocketService.name);
  private readonly listeners = new Map<string, Set<SocketTopicListener>>();
  private readonly pendingQrCache = new Map<string, PendingQrEntry>();
  private server: Server | null = null;

  attachServer(server: Server): void {
    this.server = server;
  }

  disconnectUserSockets(userId: string): void {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return;
    }
    if (!this.server) {
      this.logger.warn('disconnectUserSockets skipped: \n socket server not ready');
      return;
    }
    const room = getSocketUserRoom(userId.trim());
    this.logger.log(`Session handshake undone (server) \n userId=${userId.trim()} \n reason=logout_or_invalidation \n allSocketsInUserRoom`);
    void this.server.in(room).disconnectSockets(true);
  }

  setPendingQr(workspaceId: string, qr: string, deadlineMs: number | null): void {
    this.pendingQrCache.set(workspaceId, { qr, deadlineMs });
  }

  clearPendingQr(workspaceId: string): void {
    this.pendingQrCache.delete(workspaceId);
  }

  replayPendingQrToSocket(workspaceId: string, socketId: string): void {
    const entry = this.pendingQrCache.get(workspaceId);
    if (!entry) return;
    const withinWindow = entry.deadlineMs === null || Date.now() <= entry.deadlineMs;
    if (!withinWindow) {
      this.pendingQrCache.delete(workspaceId);
      return;
    }
    if (!this.server) return;
    this.server.to(socketId).emit('new-connection', { qr: entry.qr });
    this.logger.log(`Replayed pending QR to socket workspaceId=${workspaceId} socketId=${socketId}`);
  }

  emit(room: string, topic: string, payload: unknown): void {
    if (!this.isValidTopic(topic)) {
      throw new Error('emit: topic must be a non-empty string');
    }
    this.logOutgoing(room, topic, payload);
    if (!this.server) {
      this.logger.warn('emit skipped: \n socket server not ready');
      return;
    }
    this.server.to(room).emit(topic, payload);
  }

  listen(topic: string, listener: SocketTopicListener): () => void {
    if (!this.isValidTopic(topic)) {
      throw new Error('listen: topic must be a non-empty string');
    }
    if (typeof listener !== 'function') {
      throw new Error('listen: listener must be a function');
    }
    let set = this.listeners.get(topic);
    if (!set) {
      set = new Set();
      this.listeners.set(topic, set);
    }
    set.add(listener);
    return (): void => {
      const current = this.listeners.get(topic);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(topic);
      }
    };
  }

  dispatchIncoming(topic: string, payload: unknown): void {
    if (!this.isValidTopic(topic)) {
      return;
    }
    this.logIncoming(topic, payload);
    const handlers = this.listeners.get(topic);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error: unknown) {
        this.logger.error(`Listener failed \n topic="${topic}" \n error=${error instanceof Error ? error.stack : String(error)}`);
      }
    }
  }

  private isValidTopic(topic: unknown): topic is string {
    return typeof topic === 'string' && topic.trim().length > 0;
  }

  private logOutgoing(room: string, topic: string, payload: unknown): void {
    this.logger.log(`Emitting \n event=${topic} \n workspaceId=${room} \n object=${this.serializeForLog(payload)}`);
  }

  private logIncoming(topic: string, payload: unknown): void {
    this.logger.log(`Incoming \n topic="${topic}" \n ${this.serializeForLog(payload)}`);
  }

  private serializeForLog(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Unserializable]';
    }
  }
}
