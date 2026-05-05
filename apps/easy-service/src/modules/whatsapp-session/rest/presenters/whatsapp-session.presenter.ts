import type { WhatsappSession } from '../../types/interfaces/whatsapp-session.interface';
import type { WhatsappSessionResponse } from '../../types/dto/whatsapp-session.response';

export const presentWhatsappSession = (session: WhatsappSession): WhatsappSessionResponse => {
  const { _id, auth, ...rest } = session;
  void auth;
  return { id: _id, ...rest };
};
