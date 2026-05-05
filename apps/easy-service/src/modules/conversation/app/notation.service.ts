import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONVERSATION_REPOSITORY } from 'src/infra/database/mongodb/repository/mongoose-conversation.repository';
import { NotationEntity } from '../domain/notation.entity';
import { Notation } from '../types/interface/notation.interface';
import type { ConversationRepository } from '../types/repository/conversation.repository';

@Injectable()
export class NotationService {
  constructor(@Inject(CONVERSATION_REPOSITORY) private readonly conversationRepository: ConversationRepository) {}

  async create(conversationKey: string, content: string, ownerId: string): Promise<Notation> {
    const notation = new NotationEntity(content, ownerId);
    const updated = await this.conversationRepository.addNotation(conversationKey, notation);
    return (updated.notations ?? []).find((n) => n.id === notation.id)!;
  }

  async update(conversationKey: string, notationId: string, content: string, userId: string): Promise<Notation> {
    const conversation = await this.conversationRepository.findByConversationKey(conversationKey);

    const notation = conversation.notations?.find((n) => n.id === notationId);
    if (!notation) throw new NotFoundException('Notation not found');

    if (notation.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can edit this notation');
    }

    if (!NotationEntity.isWithinEditWindow(notation.createdAt)) {
      throw new ForbiddenException('Notation can only be edited within 24 hours of creation');
    }

    const normalizedContent = NotationEntity.normalizeContent(content);
    const updated = await this.conversationRepository.updateNotation(conversationKey, notationId, normalizedContent);
    return (updated.notations ?? []).find((n) => n.id === notationId)!;
  }

  async delete(conversationKey: string, notationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepository.findByConversationKey(conversationKey);

    const notation = conversation.notations?.find((n) => n.id === notationId);
    if (!notation) throw new NotFoundException('Notation not found');

    if (notation.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete this notation');
    }

    await this.conversationRepository.deleteNotation(conversationKey, notationId);
  }
}
