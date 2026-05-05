import type { WhatsappSession } from './whatsapp-session.interface';

export interface BaileysSessionConnector {
  connect(session: WhatsappSession): Promise<{ qrCode: string | null }>;
  disconnect(session: WhatsappSession): Promise<void>;
  reconnect(session: WhatsappSession): Promise<{ qrCode: string | null }>;
  replaceAuth(session: WhatsappSession): Promise<{ qrCode: string | null }>;
}
