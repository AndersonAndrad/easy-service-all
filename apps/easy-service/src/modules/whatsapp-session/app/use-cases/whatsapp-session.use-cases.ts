import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Roles } from 'src/shared/enums/roles.enum';
import { CurrentAuthContextProvider } from 'src/shared/guards/current-auth-context.provider';

import type { WorkspaceRepository } from 'src/modules/workspace/types/repository/workspace.repository';
import { WORKSPACE_REPOSITORY } from 'src/modules/workspace/types/repository/workspace.repository';
import type { BaileysSessionConnector } from '../../types/interfaces/baileys-session-connector.interface';
import type { WhatsappSession, WhatsappSessionStatus } from '../../types/interfaces/whatsapp-session.interface';
import type { WhatsappSessionRepository } from '../../types/repository/whatsapp-session.repository';
import { WHATSAPP_SESSION_REPOSITORY } from '../../types/repository/whatsapp-session.repository';
import { BAILEYS_SESSION_CONNECTOR } from '../../types/tokens/baileys-session-connector.token';

type CreateWhatsappSessionInput = Omit<WhatsappSession, '_id' | 'sessionId' | 'createdAt' | 'updatedAt' | 'status' | 'auth' | 'isActive' | 'lastConnectionAt' | 'lastDisconnectionAt' | 'lastMessageAt'> & {
  auth?: { creds: Record<string, unknown>; keys: Record<string, unknown> };
};

type UpdateWhatsappSessionInput = Partial<
  Omit<WhatsappSession, '_id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'auth'> & {
    auth?: { creds: Record<string, unknown>; keys: Record<string, unknown> };
  }
>;

type AuthContext = {
  userId: string;
  roles: Roles[];
};

const normalizeStatus = (status: string): WhatsappSessionStatus => {
  const allowed = ['connecting', 'connected', 'disconnected', 'failed', 'reconnecting'] as const;
  if (!allowed.includes(status as WhatsappSessionStatus)) {
    throw new BadRequestException('Invalid whatsapp session status');
  }
  return status as WhatsappSessionStatus;
};

@Injectable({ scope: Scope.REQUEST })
export class WhatsappSessionUseCases {
  constructor(
    @Inject(WHATSAPP_SESSION_REPOSITORY) private readonly whatsappSessionRepository: WhatsappSessionRepository,
    @Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepository: WorkspaceRepository,
    @Inject(BAILEYS_SESSION_CONNECTOR) private readonly baileysConnector: BaileysSessionConnector,
    private readonly currentAuthContext: CurrentAuthContextProvider,
  ) {}

  private getAuth(): AuthContext {
    return this.currentAuthContext.getAuthContext() as AuthContext;
  }

  private hasAdminRole(roles: Roles[]): boolean {
    return roles.includes(Roles.ADMIN) || roles.includes(Roles.SUPER_ADMIN);
  }

  private hasSuperAdminRole(roles: Roles[]): boolean {
    return roles.includes(Roles.SUPER_ADMIN);
  }

  private async ensureWorkspaceOwnership(workspaceId: string): Promise<void> {
    const auth = this.getAuth();

    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.userOwnerId !== auth.userId && !this.hasSuperAdminRole(auth.roles)) {
      throw new ForbiddenException('Workspace access denied');
    }
  }

  private async ensureSessionWorkspaceOwnership(sessionId: string): Promise<WhatsappSession> {
    const session = await this.whatsappSessionRepository.findById(sessionId);
    if (!session) throw new NotFoundException('Whatsapp session not found');

    await this.ensureWorkspaceOwnership(session.workspaceId);
    return session;
  }

  public async createWhatsappSession(input: CreateWhatsappSessionInput): Promise<WhatsappSession> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    await this.ensureWorkspaceOwnership(input.workspaceId);

    const authState = input.auth ?? { creds: {}, keys: {} };

    return this.whatsappSessionRepository.create({
      sessionId: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      phone: input.phone,
      status: 'disconnected',
      auth: authState,
      settings: input.settings,
      metadata: input.metadata,
      isActive: true,
    });
  }

  public async updateWhatsappSession(id: string, input: UpdateWhatsappSessionInput): Promise<WhatsappSession> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const existing = await this.ensureSessionWorkspaceOwnership(id);

    const updatedAt = Date.now();
    const updatePayload: Partial<WhatsappSession> = {
      ...input,
      updatedAt,
    };

    if (typeof input.status !== 'undefined') {
      updatePayload.status = normalizeStatus(input.status) as WhatsappSessionStatus;
    }

    if (typeof input.auth !== 'undefined') {
      updatePayload.auth = input.auth;
    }

    return this.whatsappSessionRepository.update(id, updatePayload);
  }

  public async deleteWhatsappSession(id: string): Promise<void> {
    const auth = this.getAuth();
    if (!this.hasSuperAdminRole(auth.roles)) throw new ForbiddenException('Super admin required');

    await this.whatsappSessionRepository.delete(id);
  }

  public async getWhatsappSessionById(id: string): Promise<WhatsappSession> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    return this.ensureSessionWorkspaceOwnership(id);
  }

  public async listWhatsappSessionsByWorkspace(workspaceId: string): Promise<WhatsappSession[]> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    if (!this.hasSuperAdminRole(auth.roles)) {
      await this.ensureWorkspaceOwnership(workspaceId);
    } else {
      const workspace = await this.workspaceRepository.findById(workspaceId);
      if (!workspace) throw new NotFoundException('Workspace not found');
    }

    return this.whatsappSessionRepository.listByWorkspaceId(workspaceId);
  }

  public async connectWhatsappSession(id: string): Promise<WhatsappSession> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const session = await this.ensureSessionWorkspaceOwnership(id);

    const now = Date.now();

    await this.whatsappSessionRepository.update(id, {
      status: 'connecting',
      lastConnectionAt: now,
      updatedAt: now,
    });

    const updated = (await this.whatsappSessionRepository.findById(id)) ?? session;

    const { qrCode } = await this.baileysConnector.connect(updated);

    const finalStatus: WhatsappSessionStatus = qrCode ? 'connecting' : 'connected';

    return this.whatsappSessionRepository.update(id, {
      status: finalStatus,
      metadata: {
        ...(updated.metadata ?? {}),
        ...(qrCode ? { qrCode } : { qrCode: null }),
      },
      updatedAt: Date.now(),
    });
  }

  public async disconnectWhatsappSession(id: string): Promise<WhatsappSession> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const session = await this.ensureSessionWorkspaceOwnership(id);
    const now = Date.now();

    await this.baileysConnector.disconnect(session);

    return this.whatsappSessionRepository.update(id, {
      status: 'disconnected',
      lastDisconnectionAt: now,
      updatedAt: now,
    });
  }

  public async reconnectWhatsappSession(id: string): Promise<WhatsappSession> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const session = await this.ensureSessionWorkspaceOwnership(id);

    const now = Date.now();

    await this.whatsappSessionRepository.update(id, {
      status: 'connecting',
      lastConnectionAt: now,
      updatedAt: now,
    });

    const { qrCode } = await this.baileysConnector.reconnect(session);
    const finalStatus: WhatsappSessionStatus = qrCode ? 'connecting' : 'connected';

    return this.whatsappSessionRepository.update(id, {
      status: finalStatus,
      metadata: {
        ...(session.metadata ?? {}),
        ...(qrCode ? { qrCode } : { qrCode: null }),
      },
      updatedAt: Date.now(),
    });
  }

  public async getWhatsappSessionQrCode(id: string): Promise<{ qrCode: string | null }> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const session = await this.ensureSessionWorkspaceOwnership(id);
    const qrCode = (session.metadata?.qrCode as string | undefined) ?? null;

    return { qrCode };
  }

  public async getWhatsappSessionStatus(id: string): Promise<{ status: string }> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const session = await this.ensureSessionWorkspaceOwnership(id);
    return { status: session.status };
  }

  public async replaceWhatsappSession(id: string): Promise<WhatsappSession> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) throw new ForbiddenException('Insufficient roles');

    const session = await this.ensureSessionWorkspaceOwnership(id);

    const now = Date.now();

    const cleared = await this.whatsappSessionRepository.update(id, {
      auth: { creds: {}, keys: {} },
      status: 'connecting',
      updatedAt: now,
      lastConnectionAt: now,
      metadata: {
        ...(session.metadata ?? {}),
        qrCode: null,
      },
    });

    const { qrCode } = await this.baileysConnector.replaceAuth(cleared);
    const finalStatus: WhatsappSessionStatus = qrCode ? 'connecting' : 'connected';

    return this.whatsappSessionRepository.update(id, {
      status: finalStatus,
      metadata: {
        ...(cleared.metadata ?? {}),
        ...(qrCode ? { qrCode } : { qrCode: null }),
      },
      updatedAt: Date.now(),
    });
  }
}
