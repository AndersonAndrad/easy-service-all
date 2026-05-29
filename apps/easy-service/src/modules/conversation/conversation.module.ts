import { Module } from '@nestjs/common';
import { CONVERSATION_REPOSITORY, MongooseConversationRepository } from 'src/infra/database/mongodb/repository/mongoose-conversation.repository';
import { MESSAGE_REPOSITORY, MongooseMessageRepository } from 'src/infra/database/mongodb/repository/mongoose-message.repository';
import { ConversationService } from './app/conversation.service';
import { NotationService } from './app/notation.service';
import { ConversationController } from './rest/conversation.controller';
import { NotationsController } from './rest/notations.controlle';

@Module({
  controllers: [ConversationController, NotationsController],
  providers: [ConversationService, NotationService, { provide: CONVERSATION_REPOSITORY, useClass: MongooseConversationRepository }, { provide: MESSAGE_REPOSITORY, useClass: MongooseMessageRepository }],
  exports: [ConversationService, { provide: MESSAGE_REPOSITORY, useClass: MongooseMessageRepository }],
})
export class ConversationModule {}
