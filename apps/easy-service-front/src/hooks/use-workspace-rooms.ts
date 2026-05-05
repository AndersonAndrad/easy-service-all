"use client";

import { useEffect, useRef } from "react";

import { useSessionSocket } from "@/contexts/session-socket-context";

function uniqueSortedIds(workspaceIds: string[]): string[] {
  return [...new Set(workspaceIds.map((id) => id.trim()).filter((id) => id.length > 0))].sort();
}

function roomsDependencyKey(workspaceIds: string[]): string {
  return JSON.stringify(uniqueSortedIds(workspaceIds));
}

export function useWorkspaceRooms(
  workspaceIds: string[],
  onJoined?: () => void
): void {
  const { socket, isRealtimeReady, handshakeEpoch } = useSessionSocket();
  const onJoinedRef = useRef(onJoined);
  onJoinedRef.current = onJoined;

  const roomsKey = roomsDependencyKey(workspaceIds);

  useEffect(() => {
    if (!socket || !isRealtimeReady || roomsKey === "[]") return;

    const ids = JSON.parse(roomsKey) as unknown;
    if (!Array.isArray(ids) || ids.length === 0) return;
    const safeIds = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (safeIds.length === 0) return;

    safeIds.forEach((workspaceId) => {
      socket.emit("workspace:join", { workspaceId });
    });
    onJoinedRef.current?.();

    return () => {
      safeIds.forEach((workspaceId) => {
        socket.emit("workspace:leave", { workspaceId });
      });
    };
  }, [socket, isRealtimeReady, roomsKey, handshakeEpoch]);
}
