export type WhatsappSessionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed' | 'reconnecting';

export interface WhatsappSessionMetadata {
  waUserId?: string | null;
  lastError?: string;
  qrCode?: string | null;
  [key: string]: unknown;
}

export interface WhatsappSession {
  _id: string;

  workspaceId: string;

  sessionId: string;

  name: string;
  phone?: string;

  status: WhatsappSessionStatus;

  auth: {
    creds: unknown;
    keys: unknown;
  };

  settings: {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    rateLimitPerMinute: number;
  };

  metadata?: WhatsappSessionMetadata;

  lastConnectionAt?: number;
  lastDisconnectionAt?: number;
  lastMessageAt?: number;

  isActive: boolean;

  createdAt: number;
  updatedAt: number;
}
