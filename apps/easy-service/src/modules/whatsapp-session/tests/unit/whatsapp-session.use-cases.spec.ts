import { ForbiddenException } from '@nestjs/common';
import { Roles } from 'src/shared/enums/roles.enum';

import type { WorkspaceRepository } from 'src/modules/workspace/types/repository/workspace.repository';
import type { Workspace } from 'src/modules/workspace/types/interfaces/workspace.interface';
import type { BaileysSessionConnector } from '../../types/interfaces/baileys-session-connector.interface';
import type { WhatsappSession } from '../../types/interfaces/whatsapp-session.interface';
import type { WhatsappSessionRepository } from '../../types/repository/whatsapp-session.repository';
import { WhatsappSessionUseCases } from '../../app/use-cases/whatsapp-session.use-cases';

const createWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'w-1',
  name: 'W',
  userOwnerId: 'u-1',
  customInterface: { color: 'red' },
  isActive: true,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const createSession = (overrides: Partial<WhatsappSession> = {}): WhatsappSession => ({
  _id: 's-1',
  sessionId: 'session-s-1',
  workspaceId: 'w-1',
  name: 'Session',
  phone: '5511999999999',
  status: 'disconnected',
  auth: { creds: {}, keys: {} },
  settings: { autoReconnect: true, maxReconnectAttempts: 3, rateLimitPerMinute: 60 },
  metadata: {},
  isActive: true,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const getAuthProvider = (userId: string, roles: Roles[]) =>
  ({
    getAuthContext: () => ({ userId, roles }),
  }) as never;

describe('WhatsappSessionUseCases', (): void => {
  it('should forbid deleteWhatsappSession when user is not super_admin', async (): Promise<void> => {
    const sessionRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByWorkspaceId: jest.fn(),
      findById: jest.fn(),
      listByWorkspaceId: jest.fn(),
    } as unknown as jest.Mocked<WhatsappSessionRepository>;

    const workspaceRepo = {} as unknown as jest.Mocked<WorkspaceRepository>;

    const connector = {} as unknown as jest.Mocked<BaileysSessionConnector>;

    const useCases = new WhatsappSessionUseCases(sessionRepo, workspaceRepo, connector, getAuthProvider('u-1', [Roles.ADMIN]));

    await expect(useCases.deleteWhatsappSession('s-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should connectWhatsappSession and set status connected when connector returns no qrCode', async (): Promise<void> => {
    const updateMock = jest.fn(async (_id: string, input: Partial<WhatsappSession>) =>
      createSession({
        status: (input.status as WhatsappSession['status']) ?? 'disconnected',
        metadata: (input.metadata as Record<string, unknown>) ?? {},
      }),
    );

    const sessionRepo = {
      create: jest.fn(),
      update: updateMock,
      delete: jest.fn(),
      deleteByWorkspaceId: jest.fn(),
      findById: jest.fn().mockResolvedValue(createSession({ status: 'connecting' })),
      listByWorkspaceId: jest.fn(),
    } as unknown as jest.Mocked<WhatsappSessionRepository>;

    const workspaceRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn().mockResolvedValue(createWorkspace()),
      find: jest.fn(),
    } as unknown as jest.Mocked<WorkspaceRepository>;

    const connector = {
      connect: jest.fn().mockResolvedValue({ qrCode: null }),
      disconnect: jest.fn(),
      reconnect: jest.fn(),
      replaceAuth: jest.fn(),
    } as unknown as jest.Mocked<BaileysSessionConnector>;

    const useCases = new WhatsappSessionUseCases(sessionRepo, workspaceRepo, connector, getAuthProvider('u-1', [Roles.ADMIN]));

    const result = await useCases.connectWhatsappSession('s-1');

    expect(connector.connect).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('connected');
  });
});
