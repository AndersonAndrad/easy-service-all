export type Workspace = {
  id: string;
  name: string;
  document: string;
  createdAt: string;
  isActive: boolean;
  customInterface: {
    color: string;
  };
  ownerSub: string;
};

export type WorkspaceListParams = {
  page: number;
  pageSize: number;
  search: string;
  ownerId?: string;
};

export type WorkspaceListResult = {
  items: Workspace[];
  total: number;
};

export type WorkspaceWriteBody = {
  name: string;
  document: string;
  customInterface: {
    color: string;
  };
  isActive: boolean;
};

export type WhatsappSessionRow = {
  id: string;
  label: string;
  status: string;
};
