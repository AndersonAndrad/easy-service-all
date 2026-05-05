import mongoose from 'mongoose';
import { Contact } from 'src/modules/contact/types/interface/contact.interface';

const contactSchema = new mongoose.Schema<Omit<Contact, 'id'>>(
  {
    workspaceId: { type: String, required: true, index: true },
    phone: { type: String, required: true, index: true },
    name: { type: String },
    alias: { type: String },
    email: { type: String },
    avatar: { type: String },
    notes: { type: String },
    sharedFromId: { type: String },
    sharedByUserId: { type: String },
    whatsappId: { type: String, index: true },
  },
  { timestamps: true },
);

contactSchema.index({ workspaceId: 1, phone: 1 }, { unique: true });

export const contactModel = mongoose.model<Contact>('Contact', contactSchema);
