import { Notation } from './notation.interface';

export type ConversationType = 'direct' | 'group';

export interface ConversationParticipant {
  name: string;
  phone: string;
  customName?: string;
}

export interface Conversation {
  _id: string;
  createdAt: Date;
  conversationKey: string;
  workspaceId: string;
  whatsappSessionId: string;
  type: ConversationType;
  attendant: ConversationParticipant;
  participants: ConversationParticipant[];
  groupJid?: string;
  groupName?: string;
  chatName?: string;
  notations?: Notation[];
}
