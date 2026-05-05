import { Message, MessageStatus } from '../interface/message.interface';

export interface MessageRepository {
  create(message: Omit<Message, '_id' | 'createdAt'>): Promise<Message>;

  findMessagesByConversationKey(conversationKey: string): Promise<Message[]>;

  findMessagesByConversationKeys(conversationKeys: string[]): Promise<Message[]>;

  update(message: Partial<Message>): Promise<Message>;

  updateStatus(messageId: string, status: MessageStatus): Promise<Message>;
}
