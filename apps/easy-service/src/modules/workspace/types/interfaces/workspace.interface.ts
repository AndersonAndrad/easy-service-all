export interface Workspace {
  id: string;
  name: string;
  document?: string;
  userOwnerId: string;
  customInterface: {
    color: string;
  };
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
