import { Conversation, ConversationParticipant } from '../interface/conversation.interface';
import { Notation } from '../interface/notation.interface';

export interface ConversationRepository {
  create(conversation: Omit<Conversation, '_id' | 'createdAt'>): Promise<Conversation>;

  findOneByParticipants(attendantPhone: string, clientPhone: string): Promise<Conversation | null>;

  findByGroupJid(groupJid: string, workspaceId: string): Promise<Conversation | null>;

  findByConversationKey(conversationKey: string): Promise<Conversation>;

  update(conversation: Partial<Conversation>): Promise<Conversation>;

  findByWorkspaceId(workspaceId: string): Promise<Conversation[]>;

  updateClientName(conversationId: string, customName: string): Promise<Conversation>;

  updateChatName(conversationKey: string, chatName: string): Promise<Conversation>;

  addParticipant(conversationKey: string, participant: ConversationParticipant): Promise<Conversation>;

  addNotation(conversationKey: string, notation: Notation): Promise<Conversation>;

  updateNotation(conversationKey: string, notationId: string, content: string): Promise<Conversation>;

  deleteNotation(conversationKey: string, notationId: string): Promise<Conversation>;
}
