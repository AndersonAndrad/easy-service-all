import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';
import { WhatsappSession } from 'src/modules/whatsapp-session/types/interfaces/whatsapp-session.interface';

const WhatsappSessionSchema = new Schema(
  {
    workspaceId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true, default: () => randomUUID() },
    name: { type: String, required: true },
    phone: { type: String, required: false },
    status: {
      type: String,
      required: true,
      enum: ['connecting', 'connected', 'disconnected', 'failed', 'reconnecting'],
      index: true,
    },
    auth: {
      creds: { type: Schema.Types.Mixed, required: true },
      keys: { type: Schema.Types.Mixed, required: true },
    },
    settings: {
      autoReconnect: { type: Boolean, required: true, default: true },
      maxReconnectAttempts: { type: Number, required: true, default: 5 },
      rateLimitPerMinute: { type: Number, required: true, default: 60 },
    },
    metadata: { type: Schema.Types.Mixed, required: false },
    lastConnectionAt: { type: Number, required: false },
    lastDisconnectionAt: { type: Number, required: false },
    lastMessageAt: { type: Number, required: false },
    isActive: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true },
);

export const whatsappSessionModel = mongoose.model<WhatsappSession>('whatsapp_sessions', WhatsappSessionSchema);
