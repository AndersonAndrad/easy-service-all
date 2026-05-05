import { ForbiddenException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';

import type { PaginatedResponse } from 'src/common/interface/paginated.interface';
import { WHATSAPP_SESSION_REPOSITORY, type WhatsappSessionRepository } from 'src/modules/whatsapp-session/types/repository/whatsapp-session.repository';
import { Roles } from 'src/shared/enums/roles.enum';
import { CurrentAuthContextProvider } from 'src/shared/guards/current-auth-context.provider';
import { WorkspaceFindCache } from '../infrastructure/workspace-find.cache';
import type { FindWorkspacesQueryDto } from '../types/dto/find-workspaces-query.dto';
import type { Workspace } from '../types/interfaces/workspace.interface';
import { WORKSPACE_REPOSITORY, type WorkspaceRepository } from '../types/repository/workspace.repository';

type CreateWorkspaceInput = Omit<Workspace, 'id' | 'userOwnerId' | 'createdAt' | 'updatedAt'>;
type UpdateWorkspaceInput = Partial<Omit<Workspace, 'id' | 'userOwnerId' | 'createdAt' | 'updatedAt'>>;

type AuthContext = {
  userId: string;
  roles: Roles[];
};

@Injectable({ scope: Scope.REQUEST })
export class WorkspaceService {
  constructor(
    @Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepository: WorkspaceRepository,
    @Inject(WHATSAPP_SESSION_REPOSITORY) private readonly whatsappSessionRepository: WhatsappSessionRepository,
    private readonly currentAuthContext: CurrentAuthContextProvider,
    private readonly workspaceFindCache: WorkspaceFindCache,
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

  private resolveOwnerFilter(auth: AuthContext, ownerIdFromQuery?: string): string | undefined {
    if (this.hasSuperAdminRole(auth.roles)) {
      return ownerIdFromQuery;
    }
    if (ownerIdFromQuery !== undefined && ownerIdFromQuery !== auth.userId) {
      throw new ForbiddenException('Workspace access denied');
    }
    return auth.userId;
  }

  private paginatedCacheKey(page: number, pageSize: number, ownerFilter: string | undefined): string {
    return JSON.stringify({ page, pageSize, ownerId: ownerFilter ?? null });
  }

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) {
      throw new ForbiddenException('Insufficient roles');
    }

    const now = Date.now();

    const workspace = await this.workspaceRepository.create({
      ...input,
      userOwnerId: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    this.workspaceFindCache.clear();
    return workspace;
  }

  async update(id: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) {
      throw new ForbiddenException('Insufficient roles');
    }

    const existing = await this.workspaceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Workspace not found');
    }

    if (existing.userOwnerId !== auth.userId) {
      throw new ForbiddenException('Workspace access denied');
    }

    const workspace = await this.workspaceRepository.update(id, {
      ...input,
      updatedAt: Date.now(),
    });

    this.workspaceFindCache.clear();
    return workspace;
  }

  async delete(id: string): Promise<void> {
    const auth = this.getAuth();
    if (!this.hasSuperAdminRole(auth.roles)) {
      throw new ForbiddenException('Super admin required');
    }

    await this.whatsappSessionRepository.deleteByWorkspaceId(id);
    await this.workspaceRepository.delete(id);
    this.workspaceFindCache.clear();
  }

  async findById(id: string): Promise<Workspace> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) {
      throw new ForbiddenException('Insufficient roles');
    }

    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.userOwnerId !== auth.userId && !this.hasSuperAdminRole(auth.roles)) {
      throw new ForbiddenException('Workspace access denied');
    }

    return workspace;
  }

  async find(query: FindWorkspacesQueryDto): Promise<PaginatedResponse<Workspace>> {
    const auth = this.getAuth();
    if (!this.hasAdminRole(auth.roles)) {
      throw new ForbiddenException('Insufficient roles');
    }

    const ownerFilter = this.resolveOwnerFilter(auth, query.ownerId);
    const cacheKey = this.paginatedCacheKey(query.page, query.pageSize, ownerFilter);
    const cached = this.workspaceFindCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await this.workspaceRepository.find({
      page: query.page,
      pageSize: query.pageSize,
      ownerId: ownerFilter,
    });

    this.workspaceFindCache.set(cacheKey, data);
    return data;
  }
}
