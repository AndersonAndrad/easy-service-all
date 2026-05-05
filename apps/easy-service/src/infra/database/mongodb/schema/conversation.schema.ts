import mongoose from 'mongoose';
import { Conversation } from 'src/modules/conversation/types/interface/conversation.interface';

const notationSubSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    content: { type: String, required: true },
    ownerId: { type: String, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const participantSubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    customName: { type: String, required: false },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema<Omit<Conversation, '_id' | 'createdAt' | 'updatedAt'>>(
  {
    workspaceId: { type: String, required: true },
    whatsappSessionId: { type: String, required: true },
    conversationKey: { type: String, required: true, unique: true },
    type: { type: String, enum: ['direct', 'group'], required: true, default: 'direct' },
    attendant: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    participants: { type: [participantSubSchema], required: true, default: [] },
    groupJid: { type: String, required: false },
    groupName: { type: String, required: false },
    chatName: { type: String, required: false },
    notations: { type: [notationSubSchema], required: true, default: [] },
  },
  { timestamps: true },
);

export const conversationModel = mongoose.model<Conversation>('Conversation', conversationSchema);
