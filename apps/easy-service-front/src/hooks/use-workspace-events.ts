"use client";

import { useEffect, useRef } from "react";

import { useSessionSocket } from "@/contexts/session-socket-context";

export type WorkspaceEventHandlers = {
  onNewConnection?: (payload: unknown) => void;
  onError?: (payload: unknown) => void;
  onConnected?: (payload: unknown) => void;
};

export function useWorkspaceEvents(enabled: boolean, handlers: WorkspaceEventHandlers): void {
  const { socket } = useSessionSocket();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!socket || !enabled) return;

    const onNewConnection = (payload: unknown) => {
      handlersRef.current.onNewConnection?.(payload);
    };
    const onError = (payload: unknown) => {
      handlersRef.current.onError?.(payload);
    };
    const onConnected = (payload: unknown) => {
      handlersRef.current.onConnected?.(payload);
    };

    socket.on("new-connection", onNewConnection);
    socket.on("error", onError);
    socket.on("connected", onConnected);

    return () => {
      socket.off("new-connection", onNewConnection);
      socket.off("error", onError);
      socket.off("connected", onConnected);
    };
  }, [socket, enabled]);
}
