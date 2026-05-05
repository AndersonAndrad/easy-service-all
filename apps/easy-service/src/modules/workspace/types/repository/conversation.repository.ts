import { Conversation } from 'src/modules/conversation/types/interface/conversation.interface';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export type CreateConversationInput = {
  workspaceId: string;
  whatsappSessionId: string;
  remoteJid: string;
};

export interface ConversationRepository {
  getOrCreate(input: CreateConversationInput): Promise<Conversation>;
}
