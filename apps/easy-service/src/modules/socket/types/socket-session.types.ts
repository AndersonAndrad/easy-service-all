export type SessionAuthenticateBody = {
  token?: unknown;
  reconnecting?: unknown;
};

export type SessionAuthenticatedPayload = {
  userId: string;
};

export type SessionErrorPayload = {
  code: string;
  message: string;
};

export type SessionDisconnectedPayload = {
  reason: string;
};

export type WorkspaceRoomBody = {
  workspaceId?: unknown;
};

export type SocketSessionClientData = {
  userId?: string;
  roles?: string[];
};
