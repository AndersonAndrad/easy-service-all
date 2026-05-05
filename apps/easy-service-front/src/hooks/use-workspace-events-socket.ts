"use client";

import { useEffect, useRef } from "react";

import { useSessionSocket } from "@/contexts/session-socket-context";
import { useWorkspaceEvents } from "@/hooks/use-workspace-events";
import { useWorkspaceRooms } from "@/hooks/use-workspace-rooms";

export type WorkspaceSocketMessage = {
  event: string;
  payload?: unknown;
};

export type UseWorkspaceEventsSocketOptions = {
  workspaceId: string | null;
  enabled: boolean;
  onMessage: (message: WorkspaceSocketMessage) => void;
  onOpen?: () => void;
  /** Called when the socket receives the `connected` event (e.g. WhatsApp linked). */
  onConnected?: (payload: unknown) => void;
  /**
   * When true, also registers `onAny` for every other event (does not duplicate `new-connection`).
   */
  forwardAllEvents?: boolean;
};

export function useWorkspaceEventsSocket(options: UseWorkspaceEventsSocketOptions) {
  const { workspaceId, enabled, onMessage, onOpen, onConnected, forwardAllEvents = false } =
    options;
  const { socket, isRealtimeReady } = useSessionSocket();

  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onConnectedRef = useRef(onConnected);

  onMessageRef.current = onMessage;
  onOpenRef.current = onOpen;
  onConnectedRef.current = onConnected;

  const roomIds = enabled && workspaceId ? [workspaceId] : [];

  useWorkspaceRooms(roomIds, () => {
    onOpenRef.current?.();
  });

  useWorkspaceEvents(enabled && Boolean(workspaceId) && isRealtimeReady, {
    onNewConnection: (payload) => {
      onMessageRef.current({
        event: "new-connection",
        payload,
      });
    },
    onConnected: (payload) => {
      onConnectedRef.current?.(payload);
    },
  });

  useEffect(() => {
    if (
      !socket ||
      !workspaceId ||
      !isRealtimeReady ||
      !enabled ||
      !forwardAllEvents
    ) {
      return;
    }

    const onAnyHandler = (event: string, ...args: unknown[]) => {
      if (event === "new-connection") return;
      onMessageRef.current({
        event,
        payload: args.length === 1 ? args[0] : args,
      });
    };

    socket.onAny(onAnyHandler);

    return () => {
      socket.offAny(onAnyHandler);
    };
  }, [socket, workspaceId, isRealtimeReady, enabled, forwardAllEvents]);
}
