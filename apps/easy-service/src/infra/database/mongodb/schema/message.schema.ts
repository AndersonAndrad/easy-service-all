import mongoose from 'mongoose';
import { Message } from 'src/modules/conversation/types/interface/message.interface';

const messageSchema = new mongoose.Schema<Omit<Message, '_id' | 'createdAt' | 'updatedAt'>>(
  {
    whatsappMessageId: { type: String },
    conversationKey: { type: String, required: true },
    workspaceId: { type: String, required: true },
    whatsappSessionId: { type: String, required: true },
    sendBy: { type: String, required: true },
    payload: { type: Object, required: true },
    type: { type: String, required: true },
    attendant: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    client: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    status: { type: String, enum: ['send', 'read'], default: 'send', required: true },
  },
  { timestamps: true },
);

messageSchema.index({ whatsappMessageId: 1 }, { unique: true, sparse: true });

export const messageModel = mongoose.model<Message>('messages', messageSchema);
