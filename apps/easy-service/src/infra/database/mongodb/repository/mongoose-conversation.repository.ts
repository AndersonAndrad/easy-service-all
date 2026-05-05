import { Injectable, NotFoundException } from '@nestjs/common';
import { Conversation, ConversationParticipant } from 'src/modules/conversation/types/interface/conversation.interface';
import { Notation } from 'src/modules/conversation/types/interface/notation.interface';
import { ConversationRepository } from 'src/modules/conversation/types/repository/conversation.repository';
import { parseDocumentToObj } from 'src/shared/utils/mongoose.utils';
import { conversationModel } from '../schema/conversation.schema';

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

@Injectable()
export class MongooseConversationRepository implements ConversationRepository {
  async create(conversation: Omit<Conversation, '_id' | 'createdAt'>): Promise<Conversation> {
    if (conversation.type === 'group') {
      const result = await conversationModel.findOneAndUpdate(
        { groupJid: conversation.groupJid, workspaceId: conversation.workspaceId },
        {
          $set: {
            attendant: conversation.attendant,
            workspaceId: conversation.workspaceId,
            whatsappSessionId: conversation.whatsappSessionId,
            type: 'group',
            groupName: conversation.groupName,
            ...(conversation.groupName ? { chatName: conversation.groupName } : {}),
          },
          $setOnInsert: {
            conversationKey: conversation.conversationKey,
            groupJid: conversation.groupJid,
            participants: conversation.participants,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
      return parseDocumentToObj(result);
    }

    const clientPhone = conversation.participants[0]?.phone ?? '';
    const regex = new RegExp(`^${conversation.attendant.phone}:${clientPhone}:`);
    const result = await conversationModel.findOneAndUpdate(
      { conversationKey: { $regex: regex } },
      {
        $set: {
          attendant: conversation.attendant,
          participants: conversation.participants,
          workspaceId: conversation.workspaceId,
          whatsappSessionId: conversation.whatsappSessionId,
          type: 'direct',
        },
        $setOnInsert: { conversationKey: conversation.conversationKey },
      },
      { upsert: true, returnDocument: 'after' },
    );
    return parseDocumentToObj(result);
  }

  async findOneByParticipants(attendantPhone: string, clientPhone: string): Promise<Conversation | null> {
    const regex = new RegExp(`^${attendantPhone}:${clientPhone}:`);
    const doc = await conversationModel.findOne({ conversationKey: { $regex: regex } });
    return doc ? parseDocumentToObj(doc) : null;
  }

  async findByGroupJid(groupJid: string, workspaceId: string): Promise<Conversation | null> {
    const doc = await conversationModel.findOne({ groupJid, workspaceId });
    return doc ? parseDocumentToObj(doc) : null;
  }

  async findByConversationKey(conversationKey: string): Promise<Conversation> {
    const conversation = await conversationModel.findOne({ conversationKey });
    return parseDocumentToObj(conversation);
  }

  async update(conversation: Partial<Conversation>): Promise<Conversation> {
    const updatedConversation = await conversationModel.findByIdAndUpdate(conversation._id, conversation, { returnDocument: 'after' });
    return parseDocumentToObj(updatedConversation);
  }

  async findByWorkspaceId(workspaceId: string): Promise<Conversation[]> {
    const conversations = await conversationModel.find({ workspaceId });
    return conversations.map(parseDocumentToObj);
  }

  async updateClientName(conversationId: string, customName: string): Promise<Conversation> {
    const updated = await conversationModel.findOneAndUpdate(
      { conversationKey: conversationId },
      { $set: { 'participants.0.name': customName } },
      { returnDocument: 'after' },
    );
    if (!updated) throw new Error(`Conversation not found: ${conversationId}`);
    return parseDocumentToObj(updated);
  }

  async updateChatName(conversationKey: string, chatName: string): Promise<Conversation> {
    const updated = await conversationModel.findOneAndUpdate(
      { conversationKey },
      { $set: { chatName } },
      { returnDocument: 'after' },
    );
    if (!updated) throw new NotFoundException(`Conversation not found: ${conversationKey}`);
    return parseDocumentToObj(updated);
  }

  async addParticipant(conversationKey: string, participant: ConversationParticipant): Promise<Conversation> {
    const updated = await conversationModel.findOneAndUpdate(
      { conversationKey, 'participants.phone': { $ne: participant.phone } },
      { $push: { participants: participant } },
      { returnDocument: 'after' },
    );
    if (!updated) {
      const existing = await conversationModel.findOne({ conversationKey });
      return parseDocumentToObj(existing);
    }
    return parseDocumentToObj(updated);
  }

  async addNotation(conversationKey: string, notation: Notation): Promise<Conversation> {
    const updated = await conversationModel.findOneAndUpdate(
      { conversationKey },
      { $push: { notations: notation } },
      { returnDocument: 'after' },
    );
    if (!updated) throw new NotFoundException(`Conversation not found: ${conversationKey}`);
    return parseDocumentToObj(updated);
  }

  async updateNotation(conversationKey: string, notationId: string, content: string): Promise<Conversation> {
    const updated = await conversationModel.findOneAndUpdate(
      { conversationKey, 'notations.id': notationId },
      { $set: { 'notations.$.content': content, 'notations.$.updatedAt': new Date() } },
      { returnDocument: 'after' },
    );
    if (!updated) throw new NotFoundException(`Notation not found: ${notationId}`);
    return parseDocumentToObj(updated);
  }

  async deleteNotation(conversationKey: string, notationId: string): Promise<Conversation> {
    const updated = await conversationModel.findOneAndUpdate(
      { conversationKey },
      { $pull: { notations: { id: notationId } } },
      { returnDocument: 'after' },
    );
    if (!updated) throw new NotFoundException(`Conversation not found: ${conversationKey}`);
    return parseDocumentToObj(updated);
  }
}
