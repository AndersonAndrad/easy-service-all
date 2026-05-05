import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { WorkspaceRepository } from 'src/modules/workspace/types/repository/workspace.repository';
import { WORKSPACE_REPOSITORY } from 'src/modules/workspace/types/repository/workspace.repository';
import { Roles } from 'src/shared/enums/roles.enum';

type RequestAuth = {
  userId: string;
  roles: string[];
};

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(@Inject(WORKSPACE_REPOSITORY) private readonly workspaceRepository: WorkspaceRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const auth = request.auth as RequestAuth | undefined;
    if (!auth?.userId) {
      throw new ForbiddenException('Workspace access denied');
    }

    const workspaceId = (request.params?.workspaceId as string | undefined) ?? (request.query?.workspaceId as string | undefined);
    if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const workspace = await this.workspaceRepository.findById(workspaceId.trim());
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const isSuperAdmin = auth.roles?.includes(Roles.SUPER_ADMIN) ?? false;
    if (!isSuperAdmin && workspace.userOwnerId !== auth.userId) {
      throw new ForbiddenException('Workspace access denied');
    }

    return true;
  }
}
