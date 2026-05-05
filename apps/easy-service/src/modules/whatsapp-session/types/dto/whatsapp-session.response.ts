import type { WhatsappSession } from '../interfaces/whatsapp-session.interface';

export type WhatsappSessionResponse = Omit<WhatsappSession, '_id' | 'auth'> & {
  id: string;
};
