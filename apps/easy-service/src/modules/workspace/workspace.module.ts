import { Module } from '@nestjs/common';
import { BaileysModule } from 'src/modules/baileys/baileys.module';

import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';

import { CurrentAuthContextProvider } from 'src/shared/guards/current-auth-context.provider';
import { MongooseWhatsappSessionRepository } from 'src/infra/database/mongodb/repository/mongoose-whatsapp-session.repository';
import { WHATSAPP_SESSION_REPOSITORY } from '../whatsapp-session/types/repository/whatsapp-session.repository';
import { WorkspaceService } from './app/workspace.service';
import { WorkspaceFindCache } from './infrastructure/workspace-find.cache';
import { WorkspaceController } from './rest/controllers/workspace.controller';
import { WorkspacePersistenceModule } from './workspace-persistence.module';

@Module({
  imports: [BaileysModule, WorkspacePersistenceModule],
  controllers: [WorkspaceController],
  providers: [
    CurrentAuthContextProvider,
    WorkspaceFindCache,
    WorkspaceService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: WHATSAPP_SESSION_REPOSITORY,
      useClass: MongooseWhatsappSessionRepository,
    },
  ],
  exports: [WorkspacePersistenceModule, CurrentAuthContextProvider],
})
export class WorkspaceModule {}
