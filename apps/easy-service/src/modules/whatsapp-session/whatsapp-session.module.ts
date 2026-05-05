import { Module } from '@nestjs/common';
import { MongooseWhatsappSessionRepository } from 'src/infra/database/mongodb/repository/mongoose-whatsapp-session.repository';
import { BaileysService } from 'src/modules/baileys/app/baileys.service';
import { BaileysModule } from 'src/modules/baileys/baileys.module';
import { WorkspaceModule } from 'src/modules/workspace/workspace.module';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { WhatsappSessionUseCases } from './app/use-cases/whatsapp-session.use-cases';
import { WhatsappSessionController } from './rest/controllers/whatsapp-session.controller';
import { WHATSAPP_SESSION_REPOSITORY } from './types/repository/whatsapp-session.repository';
import { BAILEYS_SESSION_CONNECTOR } from './types/tokens/baileys-session-connector.token';

@Module({
  imports: [WorkspaceModule, BaileysModule],
  controllers: [WhatsappSessionController],
  providers: [
    WhatsappSessionUseCases,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: WHATSAPP_SESSION_REPOSITORY,
      useClass: MongooseWhatsappSessionRepository,
    },
    {
      provide: BAILEYS_SESSION_CONNECTOR,
      useExisting: BaileysService,
    },
  ],
})
export class WhatsappSessionModule {}
