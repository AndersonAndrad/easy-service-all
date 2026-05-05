export const SOCKET_CLIENT_PAYLOAD_EVENT = 'socket:payload' as const;

export const SOCKET_SUBSCRIBE_MESSAGE = 'subscribe' as const;

export const SOCKET_PUBLISH_MESSAGE = 'publish' as const;

export const SOCKET_SESSION_AUTHENTICATE = 'session:authenticate' as const;

export const SOCKET_SESSION_AUTHENTICATED = 'session:authenticated' as const;

export const SOCKET_SESSION_ERROR = 'session:error' as const;

export const SOCKET_SESSION_RECONNECTED = 'session:reconnected' as const;

export const SOCKET_SESSION_DISCONNECTED = 'session:disconnected' as const;

export const SOCKET_WORKSPACE_JOIN = 'workspace:join' as const;

export const SOCKET_WORKSPACE_LEAVE = 'workspace:leave' as const;

export const SOCKET_USER_ROOM_PREFIX = 'user:' as const;

export const SOCKET_CHAT_JOIN_CONVERSATION = 'JOIN_CONVERSATION' as const;
export const SOCKET_CHAT_LEAVE_CONVERSATION = 'LEAVE_CONVERSATION' as const;
export const SOCKET_CHAT_MARK_AS_READ = 'MARK_AS_READ' as const;
export const SOCKET_CHAT_READ_MESSAGE = 'read-message' as const;
export const SOCKET_CHAT_NEW_MESSAGE = 'new_message' as const;
export const SOCKET_CHAT_SEND_MESSAGE = 'send_message' as const;

export function getSocketUserRoom(userId: string): string {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('getSocketUserRoom: userId must be a non-empty string');
  }
  return `${SOCKET_USER_ROOM_PREFIX}${userId.trim()}`;
}

export function getConversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function getReadMessageTopic(conversationKey: string, messageId: string): string {
  return `read-message:${conversationKey}:${messageId}`;
}
