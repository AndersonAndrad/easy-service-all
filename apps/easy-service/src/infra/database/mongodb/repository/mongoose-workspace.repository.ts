import { BadRequestException, Injectable } from '@nestjs/common';

import type { PaginatedResponse } from 'src/common/interface/paginated.interface';
import type { Workspace } from 'src/modules/workspace/types/interfaces/workspace.interface';
import type { WorkspaceFindParams, WorkspaceRepository } from 'src/modules/workspace/types/repository/workspace.repository';
import { parseDocumentToObj } from 'src/shared/utils/mongoose.utils';

import { workspaceModel } from '../schema/workspace.schema';

@Injectable()
export class MongooseWorkspaceRepository implements WorkspaceRepository {
  async create(input: Omit<Workspace, 'id'>): Promise<Workspace> {
    const created = await workspaceModel.create(input);
    return parseDocumentToObj(created) as Workspace;
  }

  async update(id: string, input: Partial<Omit<Workspace, 'id' | 'userOwnerId' | 'createdAt'>>): Promise<Workspace> {
    const updated = await workspaceModel.findByIdAndUpdate(
      id,
      {
        ...input,
        updatedAt: Date.now(),
      },
      { returnDocument: 'after' },
    );

    if (!updated) {
      throw new BadRequestException('Workspace not found');
    }

    return parseDocumentToObj(updated) as Workspace;
  }

  async delete(id: string): Promise<void> {
    await workspaceModel.deleteOne({ _id: id });
  }

  async findById(id: string): Promise<Workspace | null> {
    const doc = await workspaceModel.findById(id);

    if (!doc) return null;

    return parseDocumentToObj(doc) as Workspace;
  }

  async find(params: WorkspaceFindParams): Promise<PaginatedResponse<Workspace>> {
    const { page, pageSize, ownerId } = params;
    const mongoFilter = ownerId ? { userOwnerId: ownerId } : {};
    const skip = (page - 1) * pageSize;

    const [docs, totalItems] = await Promise.all([workspaceModel.find(mongoFilter).skip(skip).limit(pageSize).exec(), workspaceModel.countDocuments(mongoFilter)]);

    return {
      items: docs.map((doc): Workspace => parseDocumentToObj(doc) as Workspace),
      info: {
        currentPage: page,
        totalItems,
        itemsPerPage: pageSize,
      },
    };
  }

  async listAll(): Promise<Workspace[]> {
    const docs = await workspaceModel.find({}).exec();
    return docs.map((doc): Workspace => parseDocumentToObj(doc) as Workspace);
  }
}
