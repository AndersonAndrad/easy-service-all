import type { PaginatedRequest, PaginatedResponse } from 'src/common/interface/paginated.interface';
import type { Contact } from '../interface/contact.interface';

export const CONTACT_REPOSITORY = Symbol('CONTACT_REPOSITORY');

export type ContactFindParams = PaginatedRequest & { search?: string };

export interface ContactRepository {
  /** Insert if phone+workspace is new; return existing otherwise. Always updates whatsappId when provided. */
  upsertByPhone(input: { workspaceId: string; phone: string; name?: string; whatsappId?: string }): Promise<Contact>;
  create(input: Omit<Contact, '_id' | 'createdAt' | 'updatedAt'>): Promise<Contact>;
  findById(id: string): Promise<Contact | null>;
  findByPhoneAndWorkspace(phone: string, workspaceId: string): Promise<Contact | null>;
  find(workspaceId: string, params: ContactFindParams): Promise<PaginatedResponse<Contact>>;
  update(id: string, input: Partial<Omit<Contact, '_id' | 'workspaceId' | 'createdAt'>>): Promise<Contact>;
  delete(id: string): Promise<void>;
}
