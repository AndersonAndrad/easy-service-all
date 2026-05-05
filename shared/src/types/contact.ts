export interface Contact {
  _id: string;
  workspaceId: string;
  phone: string;
  name?: string;
  alias?: string;
  email?: string;
  avatar?: string;
  notes?: string;
  sharedFromId?: string;
  sharedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactListParams = {
  page: number;
  pageSize: number;
  search?: string;
  workspaceId?: string;
};

export type ContactListResult = {
  items: Contact[];
  total: number;
};

export type ContactCreateBody = {
  workspaceId: string;
  phone: string;
  name?: string;
  alias?: string;
  email?: string;
  notes?: string;
};

export type ContactUpdateBody = {
  name?: string;
  alias?: string;
  email?: string;
  avatar?: string;
  notes?: string;
};
