"use client";

import { useEffect, useRef } from "react";

import { useSessionSocket } from "@/contexts/session-socket-context";
import {
  parseChatConversation,
  parseChatMessage,
  type Conversation,
  type Message,
  type MessageStatus,
} from "@/lib/chat-client";

export type MessageStatusUpdate = {
  messageId: string;
  conversationKey: string;
  status: MessageStatus;
};

export type ChatSocketHandlers = {
  onNewMessage?: (message: Message) => void;
  onUpdateConversation?: (conversation: Conversation) => void;
  onUnreadCountUpdated?: (payload: { conversationId: string; unreadCount: number }) => void;
  onMessageStatusUpdate?: (update: MessageStatusUpdate) => void;
};

/**
 * Joins a conversation room via socket and listens for chat events.
 * Automatically re-joins when the socket reconnects (handshakeEpoch changes).
 */
export function useConversationSocket(
  conversationId: string | null,
  handlers: ChatSocketHandlers
): void {
  const { socket, isRealtimeReady, handshakeEpoch } = useSessionSocket();

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Join/leave conversation room
  useEffect(() => {
    if (!socket || !isRealtimeReady || !conversationId) return;

    socket.emit("JOIN_CONVERSATION", { conversationId });

    return () => {
      socket.emit("LEAVE_CONVERSATION", { conversationId });
    };
  }, [socket, isRealtimeReady, conversationId, handshakeEpoch]);

  // Listen to chat events
  useEffect(() => {
    if (!socket || !isRealtimeReady) return;

    const onNewMessage = (payload: unknown) => {
      const msg = parseChatMessage(payload);
      if (msg) handlersRef.current.onNewMessage?.(msg);
    };

    const onUpdateConversation = (payload: unknown) => {
      const conv = parseChatConversation(payload);
      if (conv) handlersRef.current.onUpdateConversation?.(conv);
    };

    const onUnreadCountUpdated = (payload: unknown) => {
      handlersRef.current.onUnreadCountUpdated?.(
        payload as { conversationId: string; unreadCount: number }
      );
    };

    const onAny = (event: string, payload: unknown) => {
      if (!event.startsWith("read-message:")) return;
      if (!payload || typeof payload !== "object") return;
      const p = payload as Record<string, unknown>;
      const messageId = typeof p.messageId === "string" ? p.messageId : "";
      const conversationKey = typeof p.conversationKey === "string" ? p.conversationKey : "";
      const statusRaw = typeof p.status === "string" ? p.status : "";
      const status: MessageStatus | null =
        statusRaw === "read" ? "read" : statusRaw === "sent" ? "sent" : null;
      if (messageId && conversationKey && status) {
        handlersRef.current.onMessageStatusUpdate?.({ messageId, conversationKey, status });
      }
    };

    socket.on("new_message", onNewMessage);
    socket.on("update_conversation", onUpdateConversation);
    socket.on("unread_count_updated", onUnreadCountUpdated);
    socket.onAny(onAny);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("update_conversation", onUpdateConversation);
      socket.off("unread_count_updated", onUnreadCountUpdated);
      socket.offAny(onAny);
    };
  }, [socket, isRealtimeReady, handshakeEpoch]);
}
