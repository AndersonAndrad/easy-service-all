import { Inject, Injectable } from '@nestjs/common';
import { CONVERSATION_REPOSITORY } from 'src/infra/database/mongodb/repository/mongoose-conversation.repository';
import { ConversationEntity } from '../domain/conversation.entity';
import { Conversation, ConversationParticipant } from '../types/interface/conversation.interface';
import type { ConversationRepository } from '../types/repository/conversation.repository';

@Injectable()
export class ConversationService {
  constructor(@Inject(CONVERSATION_REPOSITORY) private readonly conversationRepository: ConversationRepository) {}

  async create(conversation: Omit<Conversation, '_id' | 'createdAt' | 'conversationKey'>): Promise<Conversation> {
    const newConversation = new ConversationEntity(conversation);
    return this.conversationRepository.create(newConversation);
  }

  async findByConversationKey(conversationKey: string): Promise<Conversation> {
    return this.conversationRepository.findByConversationKey(conversationKey);
  }

  async getOrCreate(params: { type: 'direct'; workspaceId: string; whatsappSessionId: string; attendant: ConversationParticipant; client: ConversationParticipant }): Promise<Conversation> {
    const existing = await this.conversationRepository.findOneByParticipants(params.attendant.phone, params.client.phone);
    if (existing) return existing;
    return this.create({
      type: 'direct',
      workspaceId: params.workspaceId,
      whatsappSessionId: params.whatsappSessionId,
      attendant: params.attendant,
      participants: [params.client],
    });
  }

  async getOrCreateGroup(params: { workspaceId: string; whatsappSessionId: string; attendant: ConversationParticipant; groupJid: string; groupName?: string; sender: ConversationParticipant }): Promise<Conversation> {
    const existing = await this.conversationRepository.findByGroupJid(params.groupJid, params.workspaceId);

    if (existing) {
      const alreadyParticipant = existing.participants.some((p) => p.phone === params.sender.phone);
      if (!alreadyParticipant) {
        return this.conversationRepository.addParticipant(existing.conversationKey, params.sender);
      }
      return existing;
    }

    return this.create({
      type: 'group',
      workspaceId: params.workspaceId,
      whatsappSessionId: params.whatsappSessionId,
      attendant: params.attendant,
      participants: [params.sender],
      groupJid: params.groupJid,
      groupName: params.groupName,
    });
  }

  async update(conversation: Partial<Conversation>): Promise<Conversation> {
    return this.conversationRepository.update(conversation);
  }

  async findByWorkspaceId(workspaceId: string): Promise<Conversation[]> {
    return this.conversationRepository.findByWorkspaceId(workspaceId);
  }

  async updateClientName(conversationId: string, customName: string): Promise<Conversation> {
    return this.conversationRepository.updateClientName(conversationId, customName);
  }

  async updateChatName(conversationKey: string, chatName: string): Promise<Conversation> {
    return this.conversationRepository.updateChatName(conversationKey, chatName);
  }
}
