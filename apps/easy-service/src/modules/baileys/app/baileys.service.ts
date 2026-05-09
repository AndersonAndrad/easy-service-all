import { Boom } from '@hapi/boom';
import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import makeWASocket, { type AuthenticationCreds, type ConnectionState, DisconnectReason, fetchLatestBaileysVersion, type WAMessage } from '@whiskeysockets/baileys';
import { randomUUID } from 'crypto';
import * as https from 'https';
import pino from 'pino';
import { MongoConnectionService } from 'src/infra/database/mongodb/mongo-connection.service';
import type { ContactRepository } from 'src/modules/contact/types/repository/contact.repository';
import { CONTACT_REPOSITORY } from 'src/modules/contact/types/repository/contact.repository';
import { ConversationService } from 'src/modules/conversation/app/conversation.service';
import { MessageType } from 'src/modules/conversation/types/enum/message-type.enum';
import type { Conversation } from 'src/modules/conversation/types/interface/conversation.interface';
import type { Message } from 'src/modules/conversation/types/interface/message.interface';
import { SocketService } from 'src/modules/socket/app/socket.service';
import { getConversationRoom, getReadMessageTopic, SOCKET_CHAT_NEW_MESSAGE, SOCKET_CHAT_READ_MESSAGE, SOCKET_CHAT_SEND_MESSAGE } from 'src/modules/socket/socket.constants';
import type { BaileysSessionConnector } from 'src/modules/whatsapp-session/types/interfaces/baileys-session-connector.interface';
import type { WhatsappSession } from 'src/modules/whatsapp-session/types/interfaces/whatsapp-session.interface';
import { WHATSAPP_SESSION_REPOSITORY, type WhatsappSessionRepository } from 'src/modules/whatsapp-session/types/repository/whatsapp-session.repository';
import { WORKSPACE_REPOSITORY, type WorkspaceRepository } from 'src/modules/workspace/types/repository/workspace.repository';
import { TextMessageEntity } from '../domain/text-message.entity';
import { buildAuthenticationStateFromPersisted, serializeAuthForPersistence } from '../infrastructure/baileys-auth-state.factory';
import type { WhatsappMessage } from '../types/interfaces/text-message.interface';
import { MessageService } from './message.service';

type WASocket = ReturnType<typeof makeWASocket>;

// Known-good WA protocol version — used as fallback when the remote fetch fails (e.g. SSL interception).
const FALLBACK_WA_VERSION: [number, number, number] = [2, 3000, 1035194821];

async function resolveWaVersion(): Promise<[number, number, number]> {
  try {
    const { version } = await fetchLatestBaileysVersion();
    return version as [number, number, number];
  } catch {
    return FALLBACK_WA_VERSION;
  }
}

type ConnectionOutcome = {
  resolve: (value: { qrCode: string | null }) => void;
  reject: (reason: unknown) => void;
};

type SessionRuntime = {
  workspaceId: string;
  sessionId: string;
  lastEmittedQr: string | null;
  saveDebounceTimer: ReturnType<typeof setTimeout> | null;
  messageUpsertListenerAttached: boolean;
  /** When true, QR payloads are pushed to the Socket.IO `new-connection` room (explicit pairing only). */
  emitNewConnectionQr: boolean;
  getKeyBlob: () => Record<string, Record<string, unknown>>;
  /** Epoch ms after which QR codes are no longer emitted. null = no limit. */
  qrDeadlineMs: number | null;
  /** Timer that closes the pending QR session after QR_EMIT_WINDOW_MS. */
  qrExpiryTimer: ReturnType<typeof setTimeout> | null;
};

const PENDING_SESSION_PREFIX = 'pending:';

const RECONNECT_MS_INTERVAL = 30_000;

const QR_EMIT_WINDOW_MS = 5 * 60 * 1_000; // stop emitting QR after 5 minutes without connection
const WORKSPACE_CONNECT_RETRY_MS = 30_000; // retry workspace connection every 30 s until connected

const defaultSessionSettings = (): WhatsappSession['settings'] => ({
  autoReconnect: true,
  maxReconnectAttempts: 5,
  rateLimitPerMinute: 60,
});

function errorToPlain(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const out: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };
    if (error.cause instanceof Error) {
      out.cause = { name: error.cause.name, message: error.cause.message };
    }
    return out;
  }
  return { message: String(error) };
}

@Injectable()
export class BaileysService implements BaileysSessionConnector, OnApplicationBootstrap {
  private readonly logger = new Logger(BaileysService.name);
  private readonly sockets = new Map<string, WASocket>();
  private readonly runtime = new Map<string, SessionRuntime>();
  private readonly reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly reconnectAttemptBySessionId = new Map<string, number>();
  private readonly connectionOutcomes = new Map<string, ConnectionOutcome>();
  private readonly workspaceRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private reconcileCronRunning = false;

  constructor(
    private readonly mongoConnection: MongoConnectionService,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
    private readonly socketService: SocketService,
    @Inject(WHATSAPP_SESSION_REPOSITORY) private readonly whatsappSessionRepository: WhatsappSessionRepository,
    @Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepository: WorkspaceRepository,
    @Inject(CONTACT_REPOSITORY) private readonly contactRepository: ContactRepository,
  ) {}

  private logPayload(level: 'log' | 'warn' | 'error' | 'debug' | 'verbose', payload: Record<string, unknown>): void {
    this.logger[level](JSON.stringify(payload, null, 2));
  }

  /**
   * Lifecycle order: Nest finishes `onModuleInit` (including Mongo connect) → then `onApplicationBootstrap` here.
   * Flow: application is wired → database is connected → load persisted sessions → open sockets as needed.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.mongoConnection.assertConnected();
    this.registerReadMessageListener();
    this.registerSendMessageListener();
    await this.bootstrapPersistedSessions();
    await this.bootstrapWorkspaceConnections();
  }

  private registerReadMessageListener(): void {
    this.socketService.listen(SOCKET_CHAT_READ_MESSAGE, (payload: unknown) => {
      const { conversationKey, messageId } = payload as { conversationKey: string; messageId: string };
      if (typeof conversationKey !== 'string' || typeof messageId !== 'string') {
        return;
      }
      void this.messageService
        .updateStatus(messageId, 'read')
        .then(() => {
          this.socketService.emit(
            getConversationRoom(conversationKey),
            getReadMessageTopic(conversationKey, messageId),
            { messageId, conversationKey, status: 'read' },
          );
          this.logPayload('log', {
            event: 'Baileys.message.statusUpdated',
            messageId,
            conversationKey,
            status: 'read',
          });
        })
        .catch((error: unknown) => {
          this.logPayload('error', {
            event: 'Baileys.message.statusUpdateFailed',
            messageId,
            conversationKey,
            error: errorToPlain(error),
          });
        });
    });
  }

  private registerSendMessageListener(): void {
    this.socketService.listen(SOCKET_CHAT_SEND_MESSAGE, (payload: unknown) => {
      const { conversationKey, text } = payload as { conversationKey: string; text: string };
      if (typeof conversationKey !== 'string' || typeof text !== 'string') return;
      if (!conversationKey.trim() || !text.trim()) return;

      void this.handleSendMessageFromSocket(conversationKey, text);
    });
  }

  private async handleSendMessageFromSocket(conversationKey: string, text: string): Promise<void> {
    this.logPayload('log', {
      event: 'Baileys.sendMessage.socketReceived',
      conversationKey,
      textPreview: text.length > 50 ? `${text.slice(0, 50)}…` : text,
    });

    try {
      const conversation = await this.conversationService.findByConversationKey(conversationKey);

      const sessions = await this.whatsappSessionRepository.listByWorkspaceId(conversation.workspaceId);
      const activeSession = sessions.find((s) => this.sockets.get(s.sessionId)?.user != null);

      if (!activeSession) {
        throw new BadRequestException(`No active WhatsApp session for workspaceId=${conversation.workspaceId}`);
      }

      if (conversation.type === 'group' && conversation.groupJid) {
        await this.sendMessageToJid(conversation.groupJid, text, activeSession.sessionId);
      } else {
        const clientPhone = conversation.participants[0]?.phone;
        if (!clientPhone) throw new BadRequestException('No participant found in conversation');
        await this.sendMessage(clientPhone, text, activeSession.sessionId);
      }

      this.logPayload('log', {
        event: 'Baileys.sendMessage.socketSent',
        conversationKey,
        to: conversation.type === 'group' ? conversation.groupJid : conversation.participants[0]?.phone,
        sessionId: activeSession.sessionId,
        workspaceId: conversation.workspaceId,
        textPreview: text.length > 50 ? `${text.slice(0, 50)}…` : text,
      });
    } catch (err) {
      this.logPayload('error', {
        event: 'Baileys.sendMessage.socketFailed',
        conversationKey,
        error: errorToPlain(err),
      });
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async reconcileWhatsappSessionsNotConnected(): Promise<void> {
    if (this.reconcileCronRunning) {
      this.logPayload('debug', {
        event: 'Baileys.cron.reconcileSkipped',
        reason: 'previous_tick_still_running',
      });
      return;
    }
    this.reconcileCronRunning = true;
    try {
      try {
        this.mongoConnection.assertConnected();
      } catch {
        return;
      }

      const rows = await this.whatsappSessionRepository.listSessionsForCronReconciliation();
      if (rows.length === 0) {
        return;
      }

      this.logPayload('log', {
        event: 'Baileys.cron.tick',
        candidateRowCount: rows.length,
        description: 'Sessions with status !== connected, or connected+isActive to recover dead sockets after process restart',
      });

      for (const row of rows) {
        const latest = await this.whatsappSessionRepository.findBySessionId(row.sessionId);
        if (!latest) {
          continue;
        }
        if (this.isPendingSocketKey(latest.sessionId)) {
          continue;
        }
        // Skip if a socket already exists — it may be mid-QR-scan (user not yet authenticated).
        if (this.sockets.has(latest.sessionId)) {
          continue;
        }
        if (this.reconnectTimers.has(latest.sessionId)) {
          continue;
        }

        this.logPayload('log', {
          event: 'Baileys.cron.openSocket',
          sessionId: latest.sessionId,
          workspaceId: latest.workspaceId,
          dbStatus: latest.status,
        });
        void this.internalOpenSocket(latest).catch((error: unknown) => {
          this.logConnectionFailure(latest.sessionId, latest.workspaceId, error, 'cron reconcile internalOpenSocket');
          this.scheduleOpenFailureRecovery(latest);
        });
      }
    } finally {
      this.reconcileCronRunning = false;
    }
  }

  private isWhatsAppSocketLive(sessionId: string): boolean {
    const sock = this.sockets.get(sessionId);
    return Boolean(sock?.user);
  }

  private async bootstrapPersistedSessions(): Promise<void> {
    const sessions = await this.whatsappSessionRepository.listSessionsEligibleForAutoReconnect();
    this.logPayload('log', {
      event: 'Baileys.bootstrap.loadAll',
      sessionCount: sessions.length,
      description: 'Open sockets for active sessions with registered credentials (inbound messages)',
    });
    for (const session of sessions) {
      this.logPayload('log', {
        event: 'Baileys.bootstrap.connectOne',
        sessionId: session.sessionId,
        workspaceId: session.workspaceId,
        status: session.status,
        isActive: session.isActive,
      });
      void this.internalOpenSocket(session).catch((error: unknown) => {
        this.logConnectionFailure(session.sessionId, session.workspaceId, error, 'bootstrap internalOpenSocket');
        this.scheduleOpenFailureRecovery(session);
      });
    }
  }

  async registerWorkspaceConnection(workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId.trim().length === 0) {
      throw new BadRequestException('workspaceId is required');
    }

    const sessions = await this.listActiveSessionsForWorkspace(workspaceId);
    if (sessions.length === 0) {
      void this.startPendingQrConnection(workspaceId).catch((error: unknown) => {
        this.logError(this.pendingKey(workspaceId), error);
      });
      return;
    }

    for (const session of sessions) {
      void this.internalOpenSocket(session).catch((error: unknown) => {
        this.logConnectionFailure(session.sessionId, session.workspaceId, error, 'registerWorkspaceConnection internalOpenSocket');
        this.scheduleOpenFailureRecovery(session);
        if (!this.shouldRetryOpenAfterFailure(session)) {
          this.socketService.emit(session.workspaceId, 'error', {
            message: this.formatConnectFailureReason(error),
          });
        }
      });
    }
  }

  async requestNewQrCode(workspaceId: string): Promise<{ workspaceId: string; status: 'connecting' }> {
    if (!workspaceId || workspaceId.trim().length === 0) {
      throw new BadRequestException('workspaceId is required');
    }

    // Always tear down any existing pending QR socket for this workspace.
    await this.endSocketSession(this.pendingKey(workspaceId));

    // Deactivate every existing active session so neither the reconciliation cron nor a
    // future bootstrap will silently reopen them while the new QR window is in progress.
    const list = await this.listActiveSessionsForWorkspace(workspaceId);
    for (const session of list) {
      await this.endSocketSession(session.sessionId);
      await this.whatsappSessionRepository.update(session._id, {
        isActive: false,
        status: 'failed',
        updatedAt: Date.now(),
        metadata: {
          ...(session.metadata ?? {}),
          qrCode: null,
        },
      });
    }

    // Always open a brand-new pending session. QR events are emitted for QR_EMIT_WINDOW_MS.
    void this.startPendingQrConnection(workspaceId, undefined, true).catch((error: unknown) => {
      this.logError(this.pendingKey(workspaceId), error);
    });

    return { workspaceId, status: 'connecting' };
  }

  async connect(session: WhatsappSession): Promise<{ qrCode: string | null }> {
    return new Promise((resolve, reject): void => {
      this.connectionOutcomes.set(session.sessionId, { resolve, reject });
      void this.internalOpenSocket(session, {
        emitNewConnectionQr: true,
      }).catch((error: unknown): void => {
        this.connectionOutcomes.delete(session.sessionId);
        reject(error);
      });
    });
  }

  async disconnect(session: WhatsappSession): Promise<void> {
    await this.endSocketSession(session.sessionId);
  }

  async reconnect(session: WhatsappSession): Promise<{ qrCode: string | null }> {
    await this.endSocketSession(session.sessionId);
    const latest = await this.whatsappSessionRepository.findBySessionId(session.sessionId);
    if (!latest) {
      throw new BadRequestException('Whatsapp session not found');
    }
    return this.connect(latest);
  }

  async replaceAuth(session: WhatsappSession): Promise<{ qrCode: string | null }> {
    await this.endSocketSession(session.sessionId);
    const cleared = await this.whatsappSessionRepository.update(session._id, {
      auth: { creds: {}, keys: {} },
      status: 'connecting',
      updatedAt: Date.now(),
      metadata: {
        ...(session.metadata ?? {}),
        qrCode: null,
      },
    });
    const fresh = (await this.whatsappSessionRepository.findBySessionId(session.sessionId)) ?? cleared;
    return this.connect(fresh);
  }

  private async sendMessageToJid(jid: string, text: string, sessionId?: string): Promise<void> {
    const sock = this.resolveSocketForSend(sessionId);
    if (!sock) throw new BadRequestException('WhatsApp not found');
    await sock.sendMessage(jid, { text });
    this.logPayload('log', {
      event: 'Baileys.sendMessage.sent',
      direction: 'outbound_group',
      waUserId: sock.user?.id ?? null,
      toJid: jid,
      textLength: text.length,
      textPreview: text.length > 50 ? `${text.slice(0, 50)}…` : text,
    });
  }

  async sendMessage(phone: string, message: string, sessionId?: string): Promise<{ success: boolean; from: string; to: string }> {
    const sock = this.resolveSocketForSend(sessionId);
    if (!sock) {
      throw new BadRequestException('WhatsApp not found');
    }

    const number = phone.replace(/\D/g, '');

    const result = await sock.onWhatsApp(number);

    if (!result || result.length === 0 || !result[0]?.exists) {
      throw new BadRequestException(`Number not found in WhatsApp: ${number}`);
    }

    const jid = result[0].jid;

    await sock.sendMessage(jid, { text: message });

    this.logPayload('log', {
      event: 'Baileys.sendMessage.sent',
      direction: 'outbound_api',
      waUserId: sock.user?.id ?? null,
      toPhoneDigits: number,
      toJid: jid,
      textLength: message.length,
      textPreview: message.length > 50 ? `${message.slice(0, 50)}…` : message,
    });

    return {
      success: true,
      from: sock.user?.id ?? '',
      to: jid,
    };
  }

  async sendAudioToConversation(conversationKey: string, workspaceId: string, audioBuffer: Buffer, audioUrl: string, mimeType: string): Promise<Message> {
    const conversation = await this.conversationService.findByConversationKey(conversationKey);
    const sessions = await this.whatsappSessionRepository.listByWorkspaceId(workspaceId);
    const activeSession = sessions.find((s) => this.sockets.get(s.sessionId)?.user != null);

    if (!activeSession) {
      throw new BadRequestException(`No active WhatsApp session for workspaceId=${workspaceId}`);
    }

    const sock = this.sockets.get(activeSession.sessionId);
    if (!sock) throw new BadRequestException('Socket not found');

    let jid: string;
    if (conversation.type === 'group' && conversation.groupJid) {
      jid = conversation.groupJid;
    } else {
      const clientPhone = conversation.participants[0]?.phone;
      if (!clientPhone) throw new BadRequestException('No participant found in conversation');
      const number = clientPhone.replace(/\D/g, '');
      const result = await sock.onWhatsApp(number);
      jid = result?.[0]?.exists && result[0].jid ? result[0].jid : `${number}@s.whatsapp.net`;
    }

    await sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: mimeType,
      ptt: true,
    });

    const attendantPhone = sock.user?.id?.split(':')[0]?.replace(/\D/g, '') ?? '';
    const clientParticipant = conversation.participants[0];

    const saved = await this.messageService.createAudio({
      conversationKey: conversation.conversationKey,
      workspaceId,
      whatsappSessionId: activeSession.sessionId,
      sendBy: attendantPhone,
      attendant: { name: conversation.attendant.name, phone: attendantPhone },
      client: { name: clientParticipant?.name ?? '', phone: clientParticipant?.phone ?? '' },
      audioUrl,
    });

    this.socketService.emit(workspaceId, SOCKET_CHAT_NEW_MESSAGE, saved);

    this.logPayload('log', {
      event: 'Baileys.sendAudio.sent',
      conversationKey,
      workspaceId,
      toJid: jid,
      bufferBytes: audioBuffer.length,
    });

    return saved;
  }

  private resolveSocketForSend(sessionId?: string): WASocket | null {
    if (sessionId) {
      const sock = this.sockets.get(sessionId);
      return sock?.user ? sock : null;
    }

    const connected = [...this.sockets.entries()].find(([, s]) => Boolean(s.user));
    if (!connected) {
      return null;
    }

    if (this.sockets.size > 1) {
      const withUser = [...this.sockets.values()].filter((s) => Boolean(s.user));
      if (withUser.length > 1) {
        throw new BadRequestException('sessionId is required when multiple WhatsApp sessions are connected');
      }
    }

    return connected[1];
  }

  private pendingKey(workspaceId: string): string {
    return `${PENDING_SESSION_PREFIX}${workspaceId}`;
  }

  private isPendingSocketKey(sessionId: string): boolean {
    return sessionId.startsWith(PENDING_SESSION_PREFIX);
  }

  private async listActiveSessionsForWorkspace(workspaceId: string): Promise<WhatsappSession[]> {
    const list = await this.whatsappSessionRepository.listByWorkspaceId(workspaceId);
    return list.filter((s) => s.isActive);
  }

  private async startPendingQrConnection(workspaceId: string, persistedAuth?: { creds: unknown; keys: unknown }, emitNewConnectionQr = false): Promise<void> {
    const sessionId = this.pendingKey(workspaceId);
    await this.endSocketSession(sessionId);

    this.logPayload('log', {
      event: 'Baileys.qr.pairingStart',
      workspaceId,
      mode: persistedAuth ? 'resume_after_515' : 'new_no_db_row',
    });

    try {
      const initialCreds = persistedAuth?.creds ?? {};
      const initialKeys = persistedAuth?.keys ?? {};
      const { state, getKeyBlob } = buildAuthenticationStateFromPersisted(initialCreds, initialKeys, () => {
        this.scheduleAuthSave(sessionId);
      });

      const version = await resolveWaVersion();

      const sock = makeWASocket({
        auth: state,
        version,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '120.0'],
        syncFullHistory: false,
        shouldSyncHistoryMessage: (): boolean => false,
        agent: new https.Agent({ rejectUnauthorized: false }),
      });

      this.sockets.set(sessionId, sock);

      const qrDeadlineMs = emitNewConnectionQr ? Date.now() + QR_EMIT_WINDOW_MS : null;
      this.runtime.set(sessionId, {
        workspaceId,
        sessionId,
        lastEmittedQr: null,
        saveDebounceTimer: null,
        messageUpsertListenerAttached: false,
        emitNewConnectionQr,
        getKeyBlob,
        qrDeadlineMs,
        qrExpiryTimer: null,
      });

      if (emitNewConnectionQr) {
        const rt = this.runtime.get(sessionId)!;
        rt.qrExpiryTimer = setTimeout(() => {
          void this.handleQrEmissionExpiry(workspaceId, sessionId);
        }, QR_EMIT_WINDOW_MS);
      }

      sock.ev.on('creds.update', () => {
        this.scheduleAuthSave(sessionId);
      });

      sock.ev.on('connection.update', (u: Partial<ConnectionState>): void => {
        void this.handleConnectionUpdate(sessionId, workspaceId, u);
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logPayload('error', {
        event: 'Baileys.qr.pairingStartFailed',
        sessionId,
        workspaceId,
        error: errorToPlain(error),
      });
      this.socketService.emit(workspaceId, 'error', { message });
      throw new BadRequestException(`WhatsApp connection failed: ${message}`);
    }
  }

  private async restartPendingQrSocket(workspaceId: string, pendingSessionId: string): Promise<void> {
    const sock = this.sockets.get(pendingSessionId);
    const rt = this.runtime.get(pendingSessionId);
    if (!sock || !rt) {
      this.logPayload('warn', {
        event: 'Baileys.qr.restart515PendingSocketMissing',
        workspaceId,
        pendingSessionId,
      });
      return;
    }

    if (rt.saveDebounceTimer) {
      clearTimeout(rt.saveDebounceTimer);
      rt.saveDebounceTimer = null;
    }

    const serialized = serializeAuthForPersistence(sock.authState.creds as AuthenticationCreds, rt.getKeyBlob());

    sock.ev.removeAllListeners('connection.update');
    sock.ev.removeAllListeners('creds.update');
    sock.ev.removeAllListeners('messages.upsert');
    if (typeof sock.end === 'function') {
      try {
        sock.end(undefined);
      } catch {
        /* ignore */
      }
    }

    this.sockets.delete(pendingSessionId);
    this.runtime.delete(pendingSessionId);

    await this.startPendingQrConnection(workspaceId, serialized, rt.emitNewConnectionQr);
  }

  private async createWhatsappSessionAfterQrScan(pendingSessionId: string, workspaceId: string): Promise<WhatsappSession> {
    const sock = this.sockets.get(pendingSessionId);
    const rt = this.runtime.get(pendingSessionId);
    if (!sock || !rt) {
      throw new InternalServerErrorException('Pending WhatsApp socket missing after pairing');
    }

    if (rt.saveDebounceTimer) {
      clearTimeout(rt.saveDebounceTimer);
      rt.saveDebounceTimer = null;
    }

    if (rt.qrExpiryTimer) {
      clearTimeout(rt.qrExpiryTimer);
      rt.qrExpiryTimer = null;
    }

    const rawUserId = sock.user?.id as string | undefined;
    const connectedPhone = rawUserId?.split(':')[0]?.replace(/\D/g, '') ?? undefined;
    const connectedAt = Date.now();
    const creds = sock.authState.creds as AuthenticationCreds;
    const serialized = serializeAuthForPersistence(creds, rt.getKeyBlob());

    const created = await this.whatsappSessionRepository.create({
      sessionId: randomUUID(),
      workspaceId,
      name: `workspace-${workspaceId}-session`,
      status: 'connected',
      auth: serialized,
      phone: connectedPhone,
      settings: defaultSessionSettings(),
      metadata: {
        waUserId: rawUserId ?? null,
        qrCode: null,
      },
      isActive: true,
      lastConnectionAt: connectedAt,
    });

    const realSessionId = created.sessionId;

    this.sockets.delete(pendingSessionId);
    this.runtime.delete(pendingSessionId);
    this.sockets.set(realSessionId, sock);
    this.runtime.set(realSessionId, {
      workspaceId,
      sessionId: realSessionId,
      lastEmittedQr: null,
      saveDebounceTimer: null,
      messageUpsertListenerAttached: false,
      emitNewConnectionQr: false,
      getKeyBlob: rt.getKeyBlob,
      qrDeadlineMs: null,
      qrExpiryTimer: null,
    });

    sock.ev.removeAllListeners('creds.update');
    sock.ev.removeAllListeners('connection.update');
    sock.ev.on('creds.update', () => {
      this.scheduleAuthSave(realSessionId);
    });
    sock.ev.on('connection.update', (u: Partial<ConnectionState>): void => {
      void this.handleConnectionUpdate(realSessionId, workspaceId, u);
    });

    this.listenMessages(realSessionId);

    return created;
  }

  private async internalOpenSocket(session: WhatsappSession, options?: { emitNewConnectionQr?: boolean }): Promise<void> {
    const { sessionId, workspaceId } = session;
    const emitNewConnectionQr = options?.emitNewConnectionQr ?? false;

    await this.endSocketSession(sessionId);

    this.logPayload('log', {
      event: 'Baileys.socket.opening',
      sessionId,
      workspaceId,
      dbStatus: session.status,
    });

    try {
      const creds = session.auth?.creds ?? {};
      const keys = session.auth?.keys ?? {};
      const { state, getKeyBlob } = buildAuthenticationStateFromPersisted(creds, keys, () => {
        this.scheduleAuthSave(sessionId);
      });

      const version = await resolveWaVersion();

      const sock = makeWASocket({
        auth: state,
        version,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '120.0'],
        syncFullHistory: false,
        shouldSyncHistoryMessage: (): boolean => false,
        agent: new https.Agent({ rejectUnauthorized: false }),
      });

      this.sockets.set(sessionId, sock);
      this.runtime.set(sessionId, {
        workspaceId,
        sessionId,
        lastEmittedQr: null,
        saveDebounceTimer: null,
        messageUpsertListenerAttached: false,
        emitNewConnectionQr,
        getKeyBlob,
        qrDeadlineMs: null,
        qrExpiryTimer: null,
      });

      sock.ev.on('creds.update', () => {
        this.scheduleAuthSave(sessionId);
      });

      sock.ev.on('connection.update', (u: Partial<ConnectionState>): void => {
        void this.handleConnectionUpdate(sessionId, workspaceId, u);
      });

      if (!this.isPendingSocketKey(sessionId)) {
        this.listenMessages(sessionId);
      }
    } catch (error: unknown) {
      const reason = this.formatConnectFailureReason(error);
      this.logPayload('error', {
        event: 'Baileys.socket.openFailed',
        stage: 'makeWASocket_bind',
        sessionId,
        workspaceId,
        reason,
        error: errorToPlain(error),
      });
      this.socketService.emit(workspaceId, 'error', { message: reason });
      throw new BadRequestException(`WhatsApp connection failed: ${reason}`);
    }
  }

  private scheduleAuthSave(sessionId: string): void {
    const rt = this.runtime.get(sessionId);
    if (!rt) {
      return;
    }
    if (rt.saveDebounceTimer) {
      clearTimeout(rt.saveDebounceTimer);
    }
    rt.saveDebounceTimer = setTimeout(() => {
      rt.saveDebounceTimer = null;
      void this.persistAuthState(sessionId);
    }, 300);
  }

  private async persistAuthState(sessionId: string): Promise<void> {
    if (this.isPendingSocketKey(sessionId)) {
      return;
    }

    const sock = this.sockets.get(sessionId);
    const rt = this.runtime.get(sessionId);
    if (!sock || !rt) {
      return;
    }

    try {
      const creds = sock.authState.creds as AuthenticationCreds;
      const serialized = serializeAuthForPersistence(creds, rt.getKeyBlob());
      await this.whatsappSessionRepository.updateBySessionId(sessionId, {
        auth: serialized,
        updatedAt: Date.now(),
      });
      this.logPayload('verbose', {
        event: 'Baileys.auth.persisted',
        sessionId,
      });
    } catch (error: unknown) {
      this.logPayload('error', {
        event: 'Baileys.auth.persistFailed',
        sessionId,
        error: errorToPlain(error),
      });
    }
  }

  private async handleConnectionUpdate(sessionId: string, workspaceId: string, update: Partial<ConnectionState>): Promise<void> {
    const { connection, lastDisconnect, qr } = update;
    const newConnectionTopic = 'new-connection';
    const connectedTopic = 'connected';

    try {
      if (typeof qr === 'string' && qr.length > 0) {
        const rt = this.runtime.get(sessionId);
        if (rt && qr !== rt.lastEmittedQr) {
          rt.lastEmittedQr = qr;
          const withinWindow = rt.qrDeadlineMs === null || Date.now() <= rt.qrDeadlineMs;
          if (rt.emitNewConnectionQr && withinWindow) {
            this.logPayload('debug', {
              event: 'Baileys.qr.updated',
              sessionId,
              workspaceId,
              socketTopic: newConnectionTopic,
              qrLength: qr.length,
            });
            this.socketService.emit(workspaceId, newConnectionTopic, { qr });
            this.socketService.setPendingQr(workspaceId, qr, rt.qrDeadlineMs);
          } else if (rt.emitNewConnectionQr && !withinWindow) {
            this.logPayload('debug', {
              event: 'Baileys.qr.deadlineExceeded',
              sessionId,
              workspaceId,
              qrDeadlineMs: rt.qrDeadlineMs,
            });
          }
        }

        const outcome = this.connectionOutcomes.get(sessionId);
        if (outcome) {
          outcome.resolve({ qrCode: qr });
          this.connectionOutcomes.delete(sessionId);
        }
      }

      if (connection === 'open') {
        this.socketService.clearPendingQr(workspaceId);
        const rt = this.runtime.get(sessionId);
        if (rt) {
          rt.lastEmittedQr = null;
        }
        this.clearReconnectTimer(sessionId);
        this.clearReconnectAttemptCount(sessionId);
        this.clearWorkspaceRetryTimer(workspaceId);

        let socketTopicSessionId = sessionId;
        if (this.isPendingSocketKey(sessionId)) {
          const created = await this.createWhatsappSessionAfterQrScan(sessionId, workspaceId);
          socketTopicSessionId = created.sessionId;
          this.logPayload('log', {
            event: 'Baileys.connection.open',
            afterQrPairing: true,
            sessionId: socketTopicSessionId,
            workspaceId,
            phone: this.sockUserPhone(socketTopicSessionId) ?? null,
          });
        } else {
          this.logPayload('log', {
            event: 'Baileys.connection.open',
            afterQrPairing: false,
            sessionId,
            workspaceId,
            phone: this.sockUserPhone(sessionId) ?? null,
          });
          await this.persistConnectedSession(sessionId, workspaceId);
        }

        this.socketService.emit(workspaceId, connectedTopic, {
          workspaceId,
          sessionId: socketTopicSessionId,
        });

        const outcome = this.connectionOutcomes.get(sessionId);
        if (outcome) {
          outcome.resolve({ qrCode: null });
          this.connectionOutcomes.delete(sessionId);
        }
      }

      if (connection === 'close') {
        const err = lastDisconnect?.error;
        const boom = err && typeof (err as Boom).output !== 'undefined' ? (err as Boom) : undefined;
        const code = boom?.output?.statusCode;

        const message = boom?.message ?? (err instanceof Error ? err.message : `Connection closed (${code ?? 'unknown'})`);

        this.logPayload('warn', {
          event: 'Baileys.connection.closed',
          sessionId,
          workspaceId,
          disconnectCode: code ?? null,
          disconnectMessage: message,
          isLoggedOut: code === DisconnectReason.loggedOut,
        });

        const pendingOutcome = this.connectionOutcomes.get(sessionId);
        if (pendingOutcome) {
          pendingOutcome.reject(new Error(message));
          this.connectionOutcomes.delete(sessionId);
        }

        if (code === DisconnectReason.loggedOut) {
          this.logPayload('error', {
            event: 'Baileys.connection.loggedOut',
            sessionId,
            workspaceId,
            disconnectCode: code,
            hint: 'Session invalid on WhatsApp; pair again with QR or refresh credentials',
          });
          if (!this.isPendingSocketKey(sessionId)) {
            await this.markSessionFailed(sessionId, message);
          }
          this.socketService.emit(workspaceId, 'error', { message });
          await this.disposeSocketAfterLogout(sessionId);
          return;
        }

        if (this.isPendingSocketKey(sessionId) && code === DisconnectReason.restartRequired) {
          this.logPayload('log', {
            event: 'Baileys.qr.restart515',
            workspaceId,
            pendingSessionId: sessionId,
            description: 'New socket with carried auth after QR scan',
          });
          await this.restartPendingQrSocket(workspaceId, sessionId);
          return;
        }

        await this.disposeSocketForReconnect(sessionId);

        if (this.isPendingSocketKey(sessionId)) {
          return;
        }

        if (code === DisconnectReason.restartRequired) {
          this.logPayload('warn', {
            event: 'Baileys.reconnect.scheduledAfter515',
            sessionId,
            workspaceId,
            delayMs: RECONNECT_MS_INTERVAL,
          });
          await this.scheduleReconnect(sessionId, workspaceId);
          return;
        }

        await this.scheduleReconnect(sessionId, workspaceId);
      }
    } catch (error: unknown) {
      const reason = this.formatConnectFailureReason(error);
      this.logPayload('error', {
        event: 'Baileys.connection.updateHandlerError',
        sessionId,
        workspaceId,
        stage: 'handleConnectionUpdate',
        reason,
        error: errorToPlain(error),
      });
      this.socketService.emit(workspaceId, 'error', { message: reason });
      await this.disposeSocketAfterLogout(sessionId);
    }
  }

  private sockUserPhone(sessionId: string): string | undefined {
    const sock = this.sockets.get(sessionId);
    const rawUserId = sock?.user?.id as string | undefined;
    return rawUserId?.split(':')[0]?.replace(/\D/g, '') ?? undefined;
  }

  private logError(sessionId: string, error: unknown): void {
    const reason = this.formatConnectFailureReason(error);
    this.logPayload('error', {
      event: 'Baileys.error',
      sessionId,
      reason,
      error: errorToPlain(error),
    });
  }

  private logConnectionFailure(sessionId: string, workspaceId: string, error: unknown, stage: string): void {
    const reason = this.formatConnectFailureReason(error);
    this.logPayload('error', {
      event: 'Baileys.connection.failure',
      sessionId,
      workspaceId,
      stage,
      reason,
      error: errorToPlain(error),
    });
  }

  private formatConnectFailureReason(error: unknown): string {
    if (error instanceof BadRequestException) {
      return error.message;
    }
    if (error instanceof Error) {
      const base = `${error.name}: ${error.message}`;
      const cause = error.cause instanceof Error ? ` | cause: ${error.cause.name}: ${error.cause.message}` : '';
      return `${base}${cause}`;
    }
    return String(error);
  }

  private clearReconnectAttemptCount(sessionId: string): void {
    this.reconnectAttemptBySessionId.delete(sessionId);
  }

  private shouldRetryOpenAfterFailure(session: WhatsappSession): boolean {
    if (session.settings?.autoReconnect === false) {
      return false;
    }
    return true;
  }

  private scheduleOpenFailureRecovery(session: WhatsappSession): void {
    if (!this.shouldRetryOpenAfterFailure(session)) {
      this.logPayload('warn', {
        event: 'Baileys.reconnect.skipped',
        sessionId: session.sessionId,
        workspaceId: session.workspaceId,
        dbStatus: session.status,
        autoReconnect: session.settings?.autoReconnect ?? true,
        reason: 'autoReconnect_disabled_or_policy',
      });
      return;
    }
    void this.scheduleReconnect(session.sessionId, session.workspaceId);
  }

  private async scheduleReconnect(sessionId: string, workspaceId: string): Promise<void> {
    if (this.isPendingSocketKey(sessionId)) {
      return;
    }

    this.clearReconnectTimer(sessionId);

    const attempt = (this.reconnectAttemptBySessionId.get(sessionId) ?? 0) + 1;
    this.reconnectAttemptBySessionId.set(sessionId, attempt);

    try {
      await this.whatsappSessionRepository.updateBySessionId(sessionId, {
        status: 'reconnecting',
        updatedAt: Date.now(),
      });
    } catch {
      /* session row may be missing */
    }

    this.logPayload('log', {
      event: 'Baileys.reconnect.scheduled',
      attempt,
      sessionId,
      workspaceId,
      delayMs: RECONNECT_MS_INTERVAL,
    });

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(sessionId);
      const currentAttempt = this.reconnectAttemptBySessionId.get(sessionId) ?? attempt;
      this.logPayload('log', {
        event: 'Baileys.reconnect.executing',
        attempt: currentAttempt,
        sessionId,
        workspaceId,
        step: 'load_from_db_and_internalOpenSocket',
      });
      void this.internalOpenSocketFromRepo(sessionId).catch(async (error: unknown) => {
        const reason = this.formatConnectFailureReason(error);
        this.logPayload('error', {
          event: 'Baileys.reconnect.attemptFailed',
          attempt: currentAttempt,
          sessionId,
          workspaceId,
          reason,
          error: errorToPlain(error),
        });
        const latest = await this.whatsappSessionRepository.findBySessionId(sessionId);
        if (latest && this.shouldRetryOpenAfterFailure(latest)) {
          this.logPayload('log', {
            event: 'Baileys.reconnect.rescheduleAfterFailure',
            afterAttempt: currentAttempt,
            sessionId,
            delayMs: RECONNECT_MS_INTERVAL,
          });
          void this.scheduleReconnect(sessionId, latest.workspaceId);
          return;
        }
        this.clearReconnectAttemptCount(sessionId);
        this.logPayload('warn', {
          event: 'Baileys.reconnect.abandoned',
          afterAttempt: currentAttempt,
          sessionId,
          dbStatus: latest?.status ?? 'unknown',
          autoReconnect: latest?.settings?.autoReconnect ?? null,
        });
        this.socketService.emit(workspaceId, 'error', {
          message: reason,
        });
      });
    }, RECONNECT_MS_INTERVAL);
    this.reconnectTimers.set(sessionId, timer);
  }

  private async internalOpenSocketFromRepo(sessionId: string): Promise<void> {
    this.logPayload('log', {
      event: 'Baileys.socket.loadFromRepo',
      sessionId,
    });
    const session = await this.whatsappSessionRepository.findBySessionId(sessionId);
    if (!session) {
      throw new BadRequestException(`Whatsapp session not found in DB sessionId=${sessionId}`);
    }
    await this.internalOpenSocket(session);
  }

  private clearReconnectTimer(sessionId: string): void {
    const existing = this.reconnectTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
      this.reconnectTimers.delete(sessionId);
    }
  }

  private async disposeSocketForReconnect(sessionId: string): Promise<void> {
    const rt = this.runtime.get(sessionId);
    if (rt?.saveDebounceTimer) {
      clearTimeout(rt.saveDebounceTimer);
      rt.saveDebounceTimer = null;
    }
    if (rt?.qrExpiryTimer) {
      clearTimeout(rt.qrExpiryTimer);
      rt.qrExpiryTimer = null;
    }

    const sock = this.sockets.get(sessionId);
    if (sock?.ev) {
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('messages.upsert');
      sock.ev.removeAllListeners('creds.update');
    }

    if (sock && typeof sock.end === 'function') {
      try {
        sock.end(undefined);
      } catch {
        /* ignore */
      }
    }

    this.sockets.delete(sessionId);
    this.runtime.delete(sessionId);
  }

  private async disposeSocketAfterLogout(sessionId: string): Promise<void> {
    await this.disposeSocketForReconnect(sessionId);
  }

  private async markSessionFailed(sessionId: string, message: string): Promise<void> {
    const session = await this.whatsappSessionRepository.findBySessionId(sessionId);
    if (!session) {
      return;
    }
    await this.whatsappSessionRepository.update(session._id, {
      status: 'failed',
      updatedAt: Date.now(),
      metadata: {
        ...(session.metadata ?? {}),
        lastError: message,
      },
    });
  }

  private async persistConnectedSession(sessionId: string, workspaceId: string): Promise<void> {
    const connectedAt = Date.now();
    const rawUserId = this.sockets.get(sessionId)?.user?.id as string | undefined;
    const connectedPhone = rawUserId?.split(':')[0]?.replace(/\D/g, '') ?? undefined;
    const session = await this.whatsappSessionRepository.findBySessionId(sessionId);
    if (!session) {
      return;
    }

    await this.whatsappSessionRepository.updateBySessionId(sessionId, {
      status: 'connected',
      phone: connectedPhone,
      isActive: true,
      lastConnectionAt: connectedAt,
      metadata: {
        ...(session.metadata ?? {}),
        waUserId: rawUserId ?? null,
        qrCode: null,
      },
      updatedAt: Date.now(),
    });
  }

  // ---------------------------------------------------------------------------
  // Workspace-level connection bootstrap & retry
  // ---------------------------------------------------------------------------

  private async bootstrapWorkspaceConnections(): Promise<void> {
    const workspaces = await this.workspaceRepository.listAll();
    const active = workspaces.filter((w) => w.isActive);

    this.logPayload('log', {
      event: 'Baileys.bootstrap.workspaces',
      total: workspaces.length,
      active: active.length,
      description: 'Ensuring every active workspace has a connected WhatsApp session',
    });

    for (const workspace of active) {
      void this.ensureWorkspaceConnected(workspace.id);
    }
  }

  private isWorkspaceConnected(workspaceId: string): boolean {
    for (const [sessionId, rt] of this.runtime) {
      if (rt.workspaceId === workspaceId && this.isWhatsAppSocketLive(sessionId)) {
        return true;
      }
    }
    return false;
  }

  private async ensureWorkspaceConnected(workspaceId: string): Promise<void> {
    if (this.isWorkspaceConnected(workspaceId)) {
      this.logPayload('log', {
        event: 'Baileys.workspace.alreadyConnected',
        workspaceId,
      });
      return;
    }

    try {
      await this.tryConnectWorkspace(workspaceId);
    } catch (error: unknown) {
      this.logPayload('warn', {
        event: 'Baileys.workspace.connectFailed',
        workspaceId,
        reason: this.formatConnectFailureReason(error),
        nextRetryMs: WORKSPACE_CONNECT_RETRY_MS,
      });
    }

    // Schedule next check unless the workspace is now connected.
    if (!this.isWorkspaceConnected(workspaceId)) {
      this.scheduleWorkspaceConnectionRetry(workspaceId);
    }
  }

  private async tryConnectWorkspace(workspaceId: string): Promise<void> {
    const sessions = await this.listActiveSessionsForWorkspace(workspaceId);

    if (sessions.length === 0) {
      this.logPayload('warn', {
        event: 'Baileys.workspace.noActiveSessions',
        workspaceId,
        hint: 'No active WhatsApp sessions found — request a QR code to pair',
      });
      return;
    }

    for (const session of sessions) {
      // Skip if a socket is already open or a reconnect is already queued.
      if (this.sockets.has(session.sessionId) || this.reconnectTimers.has(session.sessionId)) {
        this.logPayload('debug', {
          event: 'Baileys.workspace.sessionAlreadyInProgress',
          workspaceId,
          sessionId: session.sessionId,
        });
        continue;
      }

      this.logPayload('log', {
        event: 'Baileys.workspace.openingSocket',
        workspaceId,
        sessionId: session.sessionId,
      });

      await this.internalOpenSocket(session);
    }
  }

  private scheduleWorkspaceConnectionRetry(workspaceId: string): void {
    if (this.workspaceRetryTimers.has(workspaceId)) {
      return; // already scheduled
    }

    this.logPayload('log', {
      event: 'Baileys.workspace.retryScheduled',
      workspaceId,
      retryInMs: WORKSPACE_CONNECT_RETRY_MS,
    });

    const timer = setTimeout(() => {
      this.workspaceRetryTimers.delete(workspaceId);
      void this.ensureWorkspaceConnected(workspaceId);
    }, WORKSPACE_CONNECT_RETRY_MS);

    this.workspaceRetryTimers.set(workspaceId, timer);
  }

  private clearWorkspaceRetryTimer(workspaceId: string): void {
    const timer = this.workspaceRetryTimers.get(workspaceId);
    if (timer) {
      clearTimeout(timer);
      this.workspaceRetryTimers.delete(workspaceId);
      this.logPayload('log', {
        event: 'Baileys.workspace.retryCleared',
        workspaceId,
        reason: 'connection_open',
      });
    }
  }

  // ---------------------------------------------------------------------------

  private async handleQrEmissionExpiry(workspaceId: string, sessionId: string): Promise<void> {
    const rt = this.runtime.get(sessionId);
    if (!rt) {
      return;
    }
    rt.qrExpiryTimer = null;

    this.logPayload('log', {
      event: 'Baileys.qr.emissionExpired',
      sessionId,
      workspaceId,
      reason: `QR emission window (${QR_EMIT_WINDOW_MS / 1000}s) elapsed without connection`,
    });

    this.socketService.clearPendingQr(workspaceId);
    this.socketService.emit(workspaceId, 'qr-timeout', { workspaceId });

    await this.endSocketSession(sessionId);
  }

  private async endSocketSession(sessionId: string): Promise<void> {
    this.clearReconnectTimer(sessionId);
    await this.disposeSocketForReconnect(sessionId);
  }

  private listenMessages(sessionId: string): void {
    const sock = this.sockets.get(sessionId);
    const rt = this.runtime.get(sessionId);
    if (!sock || !rt || rt.messageUpsertListenerAttached) {
      return;
    }
    rt.messageUpsertListenerAttached = true;

    this.logPayload('log', {
      event: 'Baileys.messages.listenerRegistered',
      sessionId,
      workspaceId: rt.workspaceId,
    });

    sock.ev.on('messages.upsert', async (event: { messages: WAMessage[]; type?: string }): Promise<void> => {
      const messages = event.messages ?? [];
      const batchType = event.type ?? 'unknown';
      const toJid = sock.user?.id ?? null;

      this.logPayload('log', {
        event: 'Baileys.messages.upsertReceived',
        sessionId,
        workspaceId: rt.workspaceId,
        batchType,
        messageCount: messages.length,
        waUserId: toJid,
        note: toJid == null ? 'No waUserId yet — finish QR pairing; chat messages usually arrive only after connection is open' : undefined,
        items: messages
          .filter((m): m is WAMessage => Boolean(m))
          .map((m) => ({
            id: m.key.id,
            fromMe: m.key.fromMe === true,
            direction: m.key.fromMe === true ? 'outbound_or_own_device' : 'inbound',
            remoteJid: m.key.remoteJid ?? null,
            participant: m.key.participant ?? null,
            preview: this.inboundMessagePreview(m),
          })),
      });

      const message = messages[0];

      if (!message) return;

      // if (message.key.fromMe === true) return;

      if (!this.isTextMessage(message)) return;

      try {
        const waMessage = message as unknown as WhatsappMessage;
        const attendantPhone = sock.user?.id?.split(':')[0]?.replace(/\D/g, '') ?? '';
        const attendant = { phone: attendantPhone, name: 'Anderson Andrade' };
        const sender = TextMessageEntity.extractClientFromMessage(waMessage);

        const isGroup = (waMessage.key.remoteJid ?? '').endsWith('@g.us');

        let conversation: Conversation;

        if (isGroup) {
          let groupName: string | undefined;
          try {
            const meta = await sock.groupMetadata(waMessage.key.remoteJid ?? '');
            groupName = meta?.subject?.trim() || undefined;
          } catch {
            // group metadata unavailable — chatName will be set once metadata is reachable
          }
          conversation = await this.conversationService.getOrCreateGroup({
            workspaceId: rt.workspaceId,
            whatsappSessionId: sessionId,
            attendant,
            groupJid: waMessage.key.remoteJid,
            groupName,
            sender,
          });
        } else {
          conversation = await this.conversationService.getOrCreate({
            type: 'direct',
            workspaceId: rt.workspaceId,
            whatsappSessionId: sessionId,
            attendant,
            client: sender,
          });
        }

        // Auto-save sender as a contact (fire-and-forget — never blocks message processing).
        // When fromMe is true the pushName is the attendant's own WhatsApp display name, not the
        // recipient's, so we must not stamp it onto the contact record.
        const normalizedPhone = sender.phone.trim().replace(/[^0-9+]/g, '');
        const contactName = waMessage.key.fromMe === true ? undefined : sender.name;
        void this.contactRepository
          .upsertByPhone({ workspaceId: rt.workspaceId, phone: normalizedPhone, name: contactName })
          .catch((err: unknown) => {
            this.logPayload('warn', {
              event: 'Baileys.contact.autoSaveFailed',
              sessionId,
              phone: sender.phone,
              workspaceId: rt.workspaceId,
              error: errorToPlain(err),
            });
          });

        // Resolve @mentions in the message text: save whatsappId to each contact and replace
        // @<id> with @<name> so the stored and emitted message is always human-readable.
        await this.resolveMentions(waMessage, rt.workspaceId, sessionId);

        // If the conversation already stores a display name for this sender, preserve it.
        const senderInConv = conversation.participants.find((p) => p.phone === sender.phone);
        const clientNameOverride =
          senderInConv?.name && senderInConv.name !== sender.phone ? senderInConv.name : undefined;

        const sendBy = waMessage.key.fromMe === true ? attendantPhone : sender.phone;

        const created = await this.messageService.create(
          { ...waMessage, workspaceId: rt.workspaceId, whatsappSessionId: sessionId, sendBy },
          attendant,
          conversation.conversationKey,
          clientNameOverride,
        );

        this.socketService.emit(rt.workspaceId, SOCKET_CHAT_NEW_MESSAGE, created);

        this.logPayload('log', {
          event: 'Baileys.messages.persisted',
          sessionId,
          messageId: created._id,
          sendBy: created.sendBy,
          senderPhone: created.client.phone,
          attendantPhone: created.attendant.phone,
          text: created.payload,
        });
      } catch (err) {
        this.logPayload('warn', {
          event: 'Baileys.messages.persistFailed',
          sessionId,
          workspaceId: rt.workspaceId,
          error: errorToPlain(err),
        });
      }
    });
  }

  private async resolveMentions(waMessage: WhatsappMessage, workspaceId: string, sessionId: string): Promise<void> {
    const mentionedJids = waMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentionedJids?.length) return;

    const originalText = waMessage.message?.extendedTextMessage?.text ?? '';
    if (!originalText) return;

    let resolvedText = originalText;

    for (const jid of mentionedJids) {
      const phone = jid.split('@')[0];
      if (!phone) continue;

      try {
        const contact = await this.contactRepository.upsertByPhone({
          workspaceId,
          phone,
          whatsappId: phone,
        });
        const displayName = contact.name ?? contact.alias ?? phone;
        resolvedText = resolvedText.replace(new RegExp(`@${phone}`, 'g'), `@${displayName}`);
      } catch (err) {
        this.logPayload('warn', {
          event: 'Baileys.mentions.resolveFailed',
          sessionId,
          jid,
          workspaceId,
          error: errorToPlain(err),
        });
      }
    }

    waMessage.message.extendedTextMessage!.text = resolvedText;
  }

  private inboundMessagePreview(message: WAMessage): string {
    const msg = message.message;
    if (!msg) {
      return '[empty]';
    }
    const text = msg.conversation ?? msg.extendedTextMessage?.text;
    if (typeof text === 'string' && text.trim().length > 0) {
      return text.trim();
    }
    const keys = Object.keys(msg).filter((k): boolean => k !== 'messageContextInfo');
    if (keys.length === 0) {
      return '[no payload]';
    }
    return `[${keys[0]}]`;
  }

  private isTextMessage(message: WAMessage): boolean {
    const msg = message?.message;
    if (!msg) return false;
    const text = msg.conversation ?? msg.extendedTextMessage?.text ?? '';
    return typeof text === 'string' && text.trim().length > 0;
  }
}
