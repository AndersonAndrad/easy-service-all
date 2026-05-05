import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { WhatsappSessionRepository } from 'src/modules/whatsapp-session/types/repository/whatsapp-session.repository';
import { Roles } from 'src/shared/enums/roles.enum';
import type { Workspace } from '../../types/interfaces/workspace.interface';
import type { WorkspaceRepository } from '../../types/repository/workspace.repository';
import { WorkspaceService } from '../../app/workspace.service';
import type { WorkspaceFindCache } from '../../infrastructure/workspace-find.cache';

const createWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'ws-1',
  name: 'Workspace 1',
  userOwnerId: 'user-1',
  customInterface: { color: 'red' },
  isActive: true,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const createWorkspaceRepositoryMock = (): jest.Mocked<WorkspaceRepository> =>
  ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  }) as unknown as jest.Mocked<WorkspaceRepository>;

const createWhatsappSessionRepositoryMock = (): jest.Mocked<WhatsappSessionRepository> =>
  ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByWorkspaceId: jest.fn(),
    findById: jest.fn(),
    listByWorkspaceId: jest.fn(),
  }) as unknown as jest.Mocked<WhatsappSessionRepository>;

const createWorkspaceFindCacheMock = (): jest.Mocked<Pick<WorkspaceFindCache, 'get' | 'set' | 'clear'>> =>
  ({
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    clear: jest.fn(),
  }) as never;

describe('WorkspaceService', (): void => {
  const getAuthContextProvider = (userId: string, roles: Roles[]) => ({
    getAuthContext: () => ({ userId, roles }),
  });

  it('should forbid create when user is not admin', async (): Promise<void> => {
    const workspaceRepo = createWorkspaceRepositoryMock();
    const sessionRepo = createWhatsappSessionRepositoryMock();

    const service = new WorkspaceService(workspaceRepo as never, sessionRepo as never, getAuthContextProvider('user-1', [] as Roles[]) as never, createWorkspaceFindCacheMock() as never);

    await expect(
      service.create({
        name: 'Workspace',
        document: undefined,
        customInterface: { color: 'blue' },
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should forbid update when workspace is not owned by admin', async (): Promise<void> => {
    const workspaceRepo = createWorkspaceRepositoryMock();
    const sessionRepo = createWhatsappSessionRepositoryMock();
    const authProvider = getAuthContextProvider('user-1', [Roles.ADMIN]);

    workspaceRepo.findById.mockResolvedValue(createWorkspace({ userOwnerId: 'user-2' }));

    const service = new WorkspaceService(workspaceRepo as never, sessionRepo as never, authProvider as never, createWorkspaceFindCacheMock() as never);

    await expect(service.update('ws-1', { name: 'New Name' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should delete workspace and related sessions when super_admin', async (): Promise<void> => {
    const workspaceRepo = createWorkspaceRepositoryMock();
    const sessionRepo = createWhatsappSessionRepositoryMock();
    const authProvider = getAuthContextProvider('user-x', [Roles.SUPER_ADMIN]);

    const cache = createWorkspaceFindCacheMock();
    const service = new WorkspaceService(workspaceRepo as never, sessionRepo as never, authProvider as never, cache as never);

    await service.delete('ws-1');

    expect(sessionRepo.deleteByWorkspaceId).toHaveBeenCalledWith('ws-1');
    expect(workspaceRepo.delete).toHaveBeenCalledWith('ws-1');
    expect(cache.clear).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException when workspace does not exist on update', async (): Promise<void> => {
    const workspaceRepo = createWorkspaceRepositoryMock();
    const sessionRepo = createWhatsappSessionRepositoryMock();
    const authProvider = getAuthContextProvider('user-1', [Roles.ADMIN]);

    workspaceRepo.findById.mockResolvedValue(null);

    const service = new WorkspaceService(workspaceRepo as never, sessionRepo as never, authProvider as never, createWorkspaceFindCacheMock() as never);

    await expect(service.update('ws-missing', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should clear paginated cache after create', async (): Promise<void> => {
    const workspaceRepo = createWorkspaceRepositoryMock();
    const sessionRepo = createWhatsappSessionRepositoryMock();
    const authProvider = getAuthContextProvider('user-1', [Roles.ADMIN]);
    const cache = createWorkspaceFindCacheMock();
    workspaceRepo.create.mockResolvedValue(createWorkspace());

    const service = new WorkspaceService(workspaceRepo as never, sessionRepo as never, authProvider as never, cache as never);

    await service.create({
      name: 'Workspace',
      document: undefined,
      customInterface: { color: 'blue' },
      isActive: true,
    });

    expect(cache.clear).toHaveBeenCalledTimes(1);
  });

  it('should clear paginated cache after update', async (): Promise<void> => {
    const workspaceRepo = createWorkspaceRepositoryMock();
    const sessionRepo = createWhatsappSessionRepositoryMock();
    const authProvider = getAuthContextProvider('user-1', [Roles.ADMIN]);
    const cache = createWorkspaceFindCacheMock();
    workspaceRepo.findById.mockResolvedValue(createWorkspace({ userOwnerId: 'user-1' }));
    workspaceRepo.update.mockResolvedValue(createWorkspace({ name: 'Updated' }));

    const service = new WorkspaceService(workspaceRepo as never, sessionRepo as never, authProvider as never, cache as never);

    await service.update('ws-1', { name: 'Updated' });

    expect(cache.clear).toHaveBeenCalledTimes(1);
  });
});
