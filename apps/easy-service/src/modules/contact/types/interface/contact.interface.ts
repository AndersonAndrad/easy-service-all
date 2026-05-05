export interface Contact {
  _id: string;
  workspaceId: string;
  phone: string;
  name?: string;
  alias?: string;
  email?: string;
  avatar?: string;
  notes?: string;
  /** ID of the original contact when this was imported from another workspace. */
  sharedFromId?: string;
  /** User ID of who shared/imported this contact. */
  sharedByUserId?: string;
  /** Raw WhatsApp mention ID (numeric portion of the JID, e.g. "173443899236587"). */
  whatsappId?: string;
  createdAt: Date;
  updatedAt: Date;
}
