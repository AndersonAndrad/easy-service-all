import { MessageType } from '../enum/message-type.enum';
import { ConversationParticipant } from './conversation.interface';

export type MessageStatus = 'send' | 'read';

export interface Message {
  _id: string;
  createdAt: Date;
  whatsappMessageId?: string;
  conversationKey: string;
  workspaceId: string;
  whatsappSessionId: string;
  sendBy: string;
  payload: any;
  type: MessageType;
  attendant: ConversationParticipant;
  client: ConversationParticipant;
  status: MessageStatus;
}
