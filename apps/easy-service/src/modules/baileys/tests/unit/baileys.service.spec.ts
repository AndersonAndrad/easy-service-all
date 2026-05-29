import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException } from '@nestjs/common';
import { MongoConnectionService } from 'src/infra/database/mongodb/mongo-connection.service';
import { ConversationService } from 'src/modules/conversation/app/conversation.service';
import { MessageService } from '../../app/message.service';
import { SocketService } from 'src/modules/socket/app/socket.service';
import { WHATSAPP_SESSION_REPOSITORY } from 'src/modules/whatsapp-session/types/repository/whatsapp-session.repository';
import { BaileysService } from '../../app/baileys.service';

const mockSock = {
  user: { id: '5511961234567:0@s.whatsapp.net' },
  authState: { creds: { registered: true }, keys: {} },
  ev: { on: jest.fn(), removeAllListeners: jest.fn() },
  end: jest.fn(),
  onWhatsApp: jest.fn().mockResolvedValue([{ exists: true }]),
  sendMessage: jest.fn(),
};

jest.mock('@whiskeysockets/baileys', () => ({
  __esModule: true,
  default: jest.fn(() => mockSock),
  DisconnectReason: { loggedOut: 401, restartRequired: 515 },
  fetchLatestBaileysVersion: jest.fn().mockResolvedValue({ version: [2, 2323, 4] }),
}));

jest.mock('../../infrastructure/baileys-auth-state.factory', () => ({
  buildAuthenticationStateFromPersisted: jest.fn(() => ({
    state: {
      creds: { registered: false },
      keys: {
        get: jest.fn(async () => ({})),
        set: jest.fn(async () => {}),
      },
    },
    getKeyBlob: jest.fn(() => ({})),
  })),
  serializeAuthForPersistence: jest.fn(() => ({ creds: {}, keys: {} })),
}));

async function settleAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 40; i++) {
    await Promise.resolve();
  }
}

describe('BaileysService', () => {
  let service: BaileysService;
  let messageService: jest.Mocked<MessageService>;
  let conversationService: jest.Mocked<ConversationService>;

  const mockConversation = {
    _id: 'conv-1',
    createdAt: new Date(),
    workspaceId: 'w-1',
    whatsappSessionId: 'sess-1',
    conversationKey: '5511961234567:5521961234567:xyz',
    participants: {
      attendant: { name: 'attendant', phone: '5511961234567' },
      client: { name: 'client', phone: '5521961234567' },
    },
  };

  const mockMessage = {
    _id: 'msg-1',
    createdAt: new Date(),
    conversationKey: mockConversation.conversationKey,
    sendBy: '5521961234567',
    payload: { text: 'Hi' },
    type: 'text',
    attendant: { name: 'attendant', phone: '5511961234567' },
    client: { name: 'client', phone: '5521961234567' },
  };

  const mockMessageService = {
    create: jest.fn(),
    findByConversationKey: jest.fn(),
    update: jest.fn(),
  };

  const mockConversationService = {
    getOrCreate: jest.fn(),
    create: jest.fn(),
    findByConversationKey: jest.fn(),
    update: jest.fn(),
  };

  const mockSocketService = {
    emit: jest.fn(),
  };

  const mockSession = {
    _id: 'doc-1',
    sessionId: 'sess-1',
    workspaceId: 'w-1',
    name: 'workspace-w-1-session',
    status: 'disconnected' as const,
    auth: { creds: {}, keys: {} },
    settings: {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      rateLimitPerMinute: 60,
    },
    metadata: {},
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
  };

  const mockMongoConnection = {
    assertConnected: jest.fn(),
  };

  const mockWhatsappSessionRepository = {
    create: jest.fn().mockResolvedValue(mockSession),
    update: jest.fn(),
    updateBySessionId: jest.fn().mockResolvedValue(mockSession),
    delete: jest.fn(),
    deleteByWorkspaceId: jest.fn(),
    findById: jest.fn(),
    findBySessionId: jest.fn().mockResolvedValue(mockSession),
    listByWorkspaceId: jest.fn().mockResolvedValue([]),
    listSessionsEligibleForAutoReconnect: jest.fn().mockResolvedValue([]),
    listAll: jest.fn().mockResolvedValue([]),
    listSessionsForCronReconciliation: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSock.ev.on.mockClear();
    mockSock.onWhatsApp.mockReset();
    mockSock.sendMessage.mockReset();
    mockSocketService.emit.mockReset();
    mockWhatsappSessionRepository.listByWorkspaceId.mockResolvedValue([]);
    mockWhatsappSessionRepository.create.mockResolvedValue(mockSession);
    mockWhatsappSessionRepository.findBySessionId.mockResolvedValue(mockSession);
    mockWhatsappSessionRepository.updateBySessionId.mockResolvedValue(mockSession);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BaileysService,
        { provide: MongoConnectionService, useValue: mockMongoConnection },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ConversationService, useValue: mockConversationService },
        { provide: SocketService, useValue: mockSocketService },
        {
          provide: WHATSAPP_SESSION_REPOSITORY,
          useValue: mockWhatsappSessionRepository,
        },
      ],
    }).compile();

    service = module.get<BaileysService>(BaileysService);
    messageService = module.get(MessageService);
    conversationService = module.get(ConversationService);
    await service.onApplicationBootstrap();
    await service.registerWorkspaceConnection('w-1');
  });

  describe('sendMessage', () => {
    it('throws BadRequestException when no connected socket', async () => {
      (service as unknown as { sockets: Map<string, unknown> }).sockets.clear();

      await expect(service.sendMessage('5521961234567', 'Hi')).rejects.toThrow(BadRequestException);
      await expect(service.sendMessage('5521961234567', 'Hi')).rejects.toThrow('WhatsApp not found');
    });

    it('throws when number is not on WhatsApp', async () => {
      mockSock.onWhatsApp.mockResolvedValue([]);

      await expect(service.sendMessage('5521961234567', 'Hi')).rejects.toThrow(BadRequestException);
      await expect(service.sendMessage('5521961234567', 'Hi')).rejects.toThrow('Number not found');
    });

    it('sends message and returns success with from and to', async () => {
      mockSock.onWhatsApp.mockResolvedValue([{ exists: true, jid: '5521961234567@s.whatsapp.net' }]);
      mockSock.sendMessage.mockResolvedValue(undefined);

      const result = await service.sendMessage('5521961234567', 'Hello');

      expect(mockSock.sendMessage).toHaveBeenCalledWith('5521961234567@s.whatsapp.net', { text: 'Hello' });
      expect(result).toEqual({
        success: true,
        from: '5511961234567:0@s.whatsapp.net',
        to: '5521961234567@s.whatsapp.net',
      });
    });
  });

  describe('listenMessages (messages.upsert handler)', () => {
    const triggerConnectionOpen = async (): Promise<void> => {
      const calls = mockSock.ev.on.mock.calls.filter((call: unknown[]) => call[0] === 'connection.update');
      const onConnectionUpdate = calls[calls.length - 1]?.[1];
      if (typeof onConnectionUpdate === 'function') await onConnectionUpdate({ connection: 'open' });
      await settleAsyncHandlers();
    };

    const getMessagesUpsertHandler = (): ((event: { messages: unknown[] }) => Promise<void>) | undefined => {
      const call = mockSock.ev.on.mock.calls.find((c: unknown[]) => c[0] === 'messages.upsert');
      return call?.[1] as ((event: { messages: unknown[] }) => Promise<void>) | undefined;
    };

    it('calls getOrCreate and create message for text message', async () => {
      await triggerConnectionOpen();
      const onMessagesUpsert = getMessagesUpsertHandler();
      expect(onMessagesUpsert).toBeDefined();

      mockConversationService.getOrCreate.mockResolvedValue(mockConversation);
      mockMessageService.create.mockResolvedValue(mockMessage);

      const textMessage = {
        key: {
          fromMe: false,
          remoteJid: '5521961234567@s.whatsapp.net',
          remoteJidAlt: '5521961234567@s.whatsapp.net',
        },
        message: { conversation: 'Hello' },
        pushName: 'Client',
      };

      await onMessagesUpsert!({ messages: [textMessage] });

      expect(conversationService.getOrCreate).toHaveBeenCalled();
      expect(messageService.create).toHaveBeenCalledWith(expect.objectContaining({ sendBy: '5521961234567' }), expect.any(Object), mockConversation.conversationKey);
    });

    it('persists outbound text when fromMe is true', async () => {
      await triggerConnectionOpen();
      const onMessagesUpsert = getMessagesUpsertHandler();
      mockConversationService.getOrCreate.mockResolvedValue(mockConversation);
      mockMessageService.create.mockResolvedValue(mockMessage);
      const fromMeMessage = {
        key: {
          fromMe: true,
          remoteJid: '5521961234567@s.whatsapp.net',
          remoteJidAlt: '5521961234567@s.whatsapp.net',
        },
        message: { conversation: 'Hi' },
        pushName: 'Self',
      };

      await onMessagesUpsert!({ messages: [fromMeMessage] });

      expect(conversationService.getOrCreate).toHaveBeenCalled();
      expect(messageService.create).toHaveBeenCalledWith(expect.objectContaining({ sendBy: '5511961234567' }), expect.any(Object), mockConversation.conversationKey);
    });

    it('does not call create when message has no text content', async () => {
      await triggerConnectionOpen();
      const onMessagesUpsert = getMessagesUpsertHandler();
      const imageMessage = {
        key: { fromMe: false, remoteJid: '5521961234567@s.whatsapp.net' },
        message: { imageMessage: {} },
      };

      await onMessagesUpsert!({ messages: [imageMessage] });

      expect(conversationService.getOrCreate).not.toHaveBeenCalled();
      expect(messageService.create).not.toHaveBeenCalled();
    });

    it('logs warning and does not throw when create fails', async () => {
      await triggerConnectionOpen();
      const onMessagesUpsert = getMessagesUpsertHandler();
      expect(onMessagesUpsert).toBeDefined();

      mockConversationService.getOrCreate.mockResolvedValue(mockConversation);
      mockMessageService.create.mockRejectedValue(new Error('DB error'));

      const textMessage = {
        key: {
          fromMe: false,
          remoteJid: '5521961234567@s.whatsapp.net',
          remoteJidAlt: '5521961234567@s.whatsapp.net',
        },
        message: { conversation: 'Hello' },
        pushName: 'Client',
      };

      const logWarnSpy = jest.spyOn(service['logger'], 'warn');

      await onMessagesUpsert!({ messages: [textMessage] });

      expect(logWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Baileys.messages.persistFailed'));
      expect(logWarnSpy).toHaveBeenCalledWith(expect.stringContaining('DB error'));
      logWarnSpy.mockRestore();
    });
  });

  describe('connection.update handler', () => {
    const getConnectionUpdateHandler = (): ((update: unknown) => Promise<void>) | undefined => {
      const calls = mockSock.ev.on.mock.calls.filter((c: unknown[]) => c[0] === 'connection.update');
      const last = calls[calls.length - 1];
      return (last?.[1] as ((update: unknown) => Promise<void>) | undefined) ?? undefined;
    };

    it('pending session: restartRequired (515) creates a new socket with carried auth', async () => {
      const { default: makeWASocket } = await import('@whiskeysockets/baileys');
      const makeWASocketMock = makeWASocket as jest.Mock;
      makeWASocketMock.mockClear();

      const onConnectionUpdate = getConnectionUpdateHandler();
      await onConnectionUpdate!({
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 515 } } } as never,
      });
      await settleAsyncHandlers();

      expect(makeWASocketMock).toHaveBeenCalledTimes(1);
    });

    it('does not emit new-connection when QR arrives from register-only pending socket', async () => {
      const onConnectionUpdate = getConnectionUpdateHandler();
      mockSocketService.emit.mockClear();
      await onConnectionUpdate!({ qr: 'silent-qr' });
      expect(mockSocketService.emit).not.toHaveBeenCalledWith('w-1', 'new-connection', { qr: 'silent-qr' });
    });

    it('handles qr update: emits { qr } to workspace room with new-connection after explicit request', async () => {
      await service.requestNewQrCode('w-1');
      await settleAsyncHandlers();
      const onConnectionUpdate = getConnectionUpdateHandler();
      expect(onConnectionUpdate).toBeDefined();
      mockSocketService.emit.mockClear();
      await onConnectionUpdate!({ qr: 'mock-qr-data' });

      expect(mockSocketService.emit).toHaveBeenCalledWith('w-1', 'new-connection', { qr: 'mock-qr-data' });
    });

    it('does not emit duplicate qr for the same payload twice', async () => {
      await service.requestNewQrCode('w-1');
      await settleAsyncHandlers();
      const onConnectionUpdate = getConnectionUpdateHandler();
      mockSocketService.emit.mockClear();
      await onConnectionUpdate!({ qr: 'same-qr' });
      await onConnectionUpdate!({ qr: 'same-qr' });
      expect(mockSocketService.emit).toHaveBeenCalledTimes(1);
    });

    it('after open, non-loggedOut close schedules reconnect', async () => {
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const onConnectionUpdate = getConnectionUpdateHandler();
      await onConnectionUpdate!({ connection: 'open' });
      mockSocketService.emit.mockClear();

      const warnSpy = jest.spyOn(service['logger'], 'warn');
      await onConnectionUpdate!({
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 500 } } } as never,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"disconnectCode": 500'));
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);
      warnSpy.mockRestore();
      setTimeoutSpy.mockRestore();
      jest.useRealTimers();
    });

    it('after open, loggedOut close logs error and emits workspace error', async () => {
      const onConnectionUpdate = getConnectionUpdateHandler();
      await onConnectionUpdate!({ connection: 'open' });
      mockSocketService.emit.mockClear();

      const errorSpy = jest.spyOn(service['logger'], 'error');
      await onConnectionUpdate!({
        connection: 'close',
        lastDisconnect: {
          error: { output: { statusCode: 401 }, message: 'logged out' },
        } as never,
      });

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Baileys.connection.loggedOut'));
      expect(mockSocketService.emit).toHaveBeenCalledWith('w-1', 'error', expect.objectContaining({ message: expect.any(String) }));
      errorSpy.mockRestore();
    });
  });
});
