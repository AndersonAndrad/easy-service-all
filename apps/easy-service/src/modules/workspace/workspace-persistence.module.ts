import { Module } from '@nestjs/common';

import { MongooseWorkspaceRepository } from 'src/infra/database/mongodb/repository/mongoose-workspace.repository';

import { WORKSPACE_REPOSITORY } from './types/repository/workspace.repository';

@Module({
  providers: [
    {
      provide: WORKSPACE_REPOSITORY,
      useClass: MongooseWorkspaceRepository,
    },
  ],
  exports: [WORKSPACE_REPOSITORY],
})
export class WorkspacePersistenceModule {}
