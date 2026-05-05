import type { WhatsappSession } from '../interfaces/whatsapp-session.interface';

export const WHATSAPP_SESSION_REPOSITORY = Symbol('WHATSAPP_SESSION_REPOSITORY');

export type WhatsappSessionInsert = Omit<WhatsappSession, '_id' | 'createdAt' | 'updatedAt'> & {
  _id?: string;
};

export interface WhatsappSessionRepository {
  create(input: WhatsappSessionInsert): Promise<WhatsappSession>;
  update(id: string, input: Partial<Omit<WhatsappSession, '_id' | 'workspaceId' | 'createdAt'>>): Promise<WhatsappSession>;
  updateBySessionId(sessionId: string, input: Partial<Omit<WhatsappSession, '_id' | 'workspaceId' | 'createdAt' | 'sessionId'>>): Promise<WhatsappSession>;
  delete(id: string): Promise<void>;
  deleteByWorkspaceId(workspaceId: string): Promise<void>;
  findById(id: string): Promise<WhatsappSession | null>;
  findBySessionId(sessionId: string): Promise<WhatsappSession | null>;
  listByWorkspaceId(workspaceId: string): Promise<WhatsappSession[]>;
  listSessionsEligibleForAutoReconnect(): Promise<WhatsappSession[]>;
  listAll(): Promise<WhatsappSession[]>;
  listSessionsForCronReconciliation(): Promise<WhatsappSession[]>;
}
