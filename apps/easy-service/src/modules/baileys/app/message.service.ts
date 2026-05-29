import { Inject, Injectable, Logger } from '@nestjs/common';
import { MESSAGE_REPOSITORY, MongooseMessageRepository } from 'src/infra/database/mongodb/repository/mongoose-message.repository';
import { MessageType } from 'src/modules/conversation/types/enum/message-type.enum';
import { ConversationParticipant } from 'src/modules/conversation/types/interface/conversation.interface';
import { Message, MessageStatus } from 'src/modules/conversation/types/interface/message.interface';
import { TextMessageEntity } from '../domain/text-message.entity';
import { WhatsappMessage } from '../types/interfaces/text-message.interface';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(@Inject(MESSAGE_REPOSITORY) private readonly messageRepository: MongooseMessageRepository) {}

  async create(message: WhatsappMessage, attendant: ConversationParticipant, conversationKey?: string, clientNameOverride?: string): Promise<Message> {
    const newMessage = new TextMessageEntity(message, attendant, conversationKey, clientNameOverride);

    this.logger.log(`New message ${(newMessage.payload?.text ?? '').slice(0, 50)}...`);

    return this.messageRepository.create(newMessage);
  }

  async findMessagesByConversationKeys(conversationKeys: string[]): Promise<Message[]> {
    return this.messageRepository.findMessagesByConversationKeys(conversationKeys);
  }

  async findMessagesByConversationKey(conversationKey: string): Promise<Message[]> {
    return this.messageRepository.findMessagesByConversationKey(conversationKey);
  }

  async createAudio(params: { conversationKey: string; workspaceId: string; whatsappSessionId: string; sendBy: string; attendant: ConversationParticipant; client: ConversationParticipant; audioUrl: string }): Promise<Message> {
    const { audioUrl, ...rest } = params;
    return this.messageRepository.create({
      ...rest,
      payload: { text: '', media: { url: audioUrl } },
      type: MessageType.audio,
      status: 'send',
    });
  }

  async updateStatus(messageId: string, status: MessageStatus): Promise<Message> {
    return this.messageRepository.updateStatus(messageId, status);
  }
}
