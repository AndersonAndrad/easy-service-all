import type { PaginatedRequest, PaginatedResponse } from 'src/common/interface/paginated.interface';

import type { Workspace } from '../interfaces/workspace.interface';

export const WORKSPACE_REPOSITORY = Symbol('WORKSPACE_REPOSITORY');

export type WorkspaceFindParams = PaginatedRequest & { ownerId?: string };

export interface WorkspaceRepository {
  create(input: Omit<Workspace, 'id'>): Promise<Workspace>;
  update(id: string, input: Partial<Omit<Workspace, 'id' | 'userOwnerId' | 'createdAt'>>): Promise<Workspace>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Workspace | null>;
  find(params: WorkspaceFindParams): Promise<PaginatedResponse<Workspace>>;
  listAll(): Promise<Workspace[]>;
}
