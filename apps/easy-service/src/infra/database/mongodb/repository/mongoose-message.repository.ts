import { Injectable } from '@nestjs/common';
import { Message, MessageStatus } from 'src/modules/conversation/types/interface/message.interface';
import { MessageRepository } from 'src/modules/conversation/types/repository/message.repository';
import { parseDocumentToObj } from 'src/shared/utils/mongoose.utils';
import { messageModel } from '../schema/message.schema';

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000;
}

@Injectable()
export class MongooseMessageRepository implements MessageRepository {
  async create(message: Omit<Message, '_id' | 'createdAt'>): Promise<Message> {
    try {
      const newMessage = await messageModel.create(message);
      return parseDocumentToObj(newMessage);
    } catch (error: unknown) {
      if (isDuplicateKeyError(error) && message.whatsappMessageId) {
        const existing = await messageModel.findOne({ whatsappMessageId: message.whatsappMessageId });
        if (existing) return parseDocumentToObj(existing);
      }
      throw error;
    }
  }

  async findMessagesByConversationKey(conversationKey: string): Promise<Message[]> {
    const messages = await messageModel.find({ conversationKey });

    console.log(JSON.stringify({ messages, conversationKey }, null, 2));

    return messages.map(parseDocumentToObj);
  }

  async findMessagesByConversationKeys(conversationKeys: string[]): Promise<Message[]> {
    const messages = await messageModel.find({ conversationKey: { $in: conversationKeys } });

    return messages.map(parseDocumentToObj);
  }

  async update(message: Partial<Message>): Promise<Message> {
    const updatedMessage = await messageModel.findByIdAndUpdate(message._id, message, { returnDocument: 'after' });

    return parseDocumentToObj(updatedMessage);
  }

  async updateStatus(messageId: string, status: MessageStatus): Promise<Message> {
    const updated = await messageModel.findByIdAndUpdate(messageId, { status }, { returnDocument: 'after' });

    return parseDocumentToObj(updated);
  }
}
