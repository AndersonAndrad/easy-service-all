import type { Contact } from '../../types/interface/contact.interface';

export const presentContact = (contact: Contact): Contact => ({ ...contact });
