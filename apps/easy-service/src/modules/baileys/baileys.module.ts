import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MongoDbModule } from 'src/infra/database/mongodb/mongodb.module';
import { MongooseContactRepository } from 'src/infra/database/mongodb/repository/mongoose-contact.repository';
import { MESSAGE_REPOSITORY, MongooseMessageRepository } from 'src/infra/database/mongodb/repository/mongoose-message.repository';
import { MongooseWhatsappSessionRepository } from 'src/infra/database/mongodb/repository/mongoose-whatsapp-session.repository';
import { ConversationModule } from 'src/modules/conversation/conversation.module';
import { CONTACT_REPOSITORY } from 'src/modules/contact/types/repository/contact.repository';
import { SocketModule } from 'src/modules/socket/socket.module';
import { WHATSAPP_SESSION_REPOSITORY } from 'src/modules/whatsapp-session/types/repository/whatsapp-session.repository';
import { WorkspacePersistenceModule } from 'src/modules/workspace/workspace-persistence.module';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from 'src/shared/guards/workspace-access.guard';
import { AudioUploadService } from './app/audio-upload.service';
import { BaileysService } from './app/baileys.service';
import { MessageService } from './app/message.service';
import { AudioController } from './rest/audio.controller';
import { BaileysController } from './rest/baileys.controller';
import { MessagesController } from './rest/messages.controller';

@Module({
  imports: [MongoDbModule, ConversationModule, SocketModule, WorkspacePersistenceModule],
  controllers: [BaileysController, MessagesController, AudioController],
  providers: [
    MessageService,
    BaileysService,
    AudioUploadService,
    JwtAuthGuard,
    Reflector,
    WorkspaceAccessGuard,
    {
      provide: WHATSAPP_SESSION_REPOSITORY,
      useClass: MongooseWhatsappSessionRepository,
    },
    {
      provide: MESSAGE_REPOSITORY,
      useClass: MongooseMessageRepository,
    },
    {
      provide: CONTACT_REPOSITORY,
      useClass: MongooseContactRepository,
    },
  ],
  exports: [BaileysService, MessageService],
})
export class BaileysModule {}
