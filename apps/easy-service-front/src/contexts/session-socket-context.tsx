"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";

import { toast } from "@/components/toast/toaster";
import { getSessionSocketUrl, getSocketIoPath } from "@/lib/session-socket-config";

import { useAuth } from "./auth-context";

const RETRY_DELAY_MS = 20_000;
const MAX_RETRIES = 5;

const EVENT_AUTHENTICATE = "session:authenticate";
const EVENT_AUTHENTICATED = "session:authenticated";
const EVENT_ERROR = "session:error";
const EVENT_RECONNECTED = "session:reconnected";
const EVENT_DISCONNECTED = "session:disconnected";
const EVENT_DISCONNECTED_TYPO = "session:disconected";

export type SessionSocketUiState = "idle" | "connected" | "retry" | "error";

type SessionSocketContextValue = {
  uiState: SessionSocketUiState;
  isRealtimeReady: boolean;
  /** Shared Socket.IO client after connect; use for workspace rooms and feature listeners. */
  socket: Socket | null;
  /** Bumps when session handshake is re-applied; use to re-run workspace room joins. */
  handshakeEpoch: number;
  /** Re-sends `session:authenticate` with the current token (same physical socket). */
  requestSessionHandshake: () => void;
};

const SessionSocketContext = createContext<SessionSocketContextValue | null>(null);

function formatSessionErrorPayload(payload: unknown): string {
  if (payload == null) return "Erro na sessão em tempo real.";
  if (typeof payload === "string" && payload.length > 0) return payload;
  if (typeof payload === "object" && "message" in (payload as object)) {
    const m = (payload as { message: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return "Erro na sessão em tempo real.";
}

const EVENT_CLIENT_FILE_LOGS = "client-file-logs";

function shouldRehandshakeAfterClientFileLogs(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const logs = (payload as { logs?: unknown }).logs;
  if (!Array.isArray(logs)) return false;
  return logs.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const message = (entry as { message?: unknown }).message;
    return (
      typeof message === "string" &&
      message.includes("session:authenticated")
    );
  });
}

export function SessionSocketProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isReady, isAuthenticated } = useAuth();
  const [uiState, setUiState] = useState<SessionSocketUiState>("idle");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [handshakeEpoch, setHandshakeEpoch] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const retriesLeftRef = useRef(MAX_RETRIES);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const reconnectPendingRef = useRef(false);
  const accessTokenRef = useRef<string | null>(null);

  accessTokenRef.current = accessToken;

  const requestSessionHandshake = useCallback(() => {
    const s = socketRef.current;
    const tok = accessTokenRef.current;
    if (!s?.connected || !tok) return;
    s.emit(EVENT_AUTHENTICATE, { token: tok });
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const teardownSocket = useCallback(() => {
    const s = socketRef.current;
    socketRef.current = null;
    setSocket(null);
    if (!s) return;
    s.removeAllListeners();
    s.disconnect();
  }, []);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !accessToken) {
      intentionalCloseRef.current = true;
      reconnectPendingRef.current = false;
      clearRetryTimer();
      teardownSocket();
      setUiState("idle");
      return;
    }

    intentionalCloseRef.current = false;
    reconnectPendingRef.current = false;
    retriesLeftRef.current = MAX_RETRIES;
    setUiState("idle");

    const scheduleReconnect = (reason: string) => {
      if (intentionalCloseRef.current || reconnectPendingRef.current) return;

      if (retriesLeftRef.current <= 0) {
        setUiState("error");
        toast.error(
          "Não foi possível manter a sessão em tempo real após 5 tentativas. Recarregue a página ou entre novamente."
        );
        return;
      }

      const attemptNumber = MAX_RETRIES - retriesLeftRef.current + 1;
      retriesLeftRef.current -= 1;
      reconnectPendingRef.current = true;
      setUiState("retry");

      toast.info(
        `Reconexão agendada (${attemptNumber}/${MAX_RETRIES}) em 20 segundos. Motivo: ${reason}.`
      );

      teardownSocket();

      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        reconnectPendingRef.current = false;
        toast.info(`Tentativa ${attemptNumber} de ${MAX_RETRIES}: reconectando sessão em tempo real…`);
        connectSocket();
      }, RETRY_DELAY_MS);
    };

    const connectSocket = () => {
      if (intentionalCloseRef.current) return;

      clearRetryTimer();
      teardownSocket();

      const url = getSessionSocketUrl();
      const path = getSocketIoPath();

      const socket = io(url, {
        path,
        transports: ["websocket"],
        reconnection: false,
        autoConnect: true,
      });
      socketRef.current = socket;
      setSocket(socket);

      if (process.env.NEXT_PUBLIC_SOCKET_IO_DEBUG === "true") {
        socket.onAny((event: string, ...args: unknown[]) => {
          const payload = args.length === 1 ? args[0] : args;
          console.info("[socket.io]", event, payload);
        });
      }

      socket.on("connect", () => {
        if (intentionalCloseRef.current) return;
        const tok = accessTokenRef.current;
        if (!tok) return;
        socket.emit(EVENT_AUTHENTICATE, { token: tok });
      });

      socket.on(EVENT_CLIENT_FILE_LOGS, (payload: unknown) => {
        if (intentionalCloseRef.current) return;
        let parsed: unknown = payload;
        if (typeof payload === "string") {
          try {
            parsed = JSON.parse(payload) as unknown;
          } catch {
            return;
          }
        }
        if (!shouldRehandshakeAfterClientFileLogs(parsed)) return;
        const tok = accessTokenRef.current;
        if (!tok || !socket.connected) return;
        socket.emit(EVENT_AUTHENTICATE, { token: tok });
        setHandshakeEpoch((e) => e + 1);
      });

      socket.on(EVENT_AUTHENTICATED, () => {
        if (intentionalCloseRef.current) return;
        retriesLeftRef.current = MAX_RETRIES;
        reconnectPendingRef.current = false;
        setUiState("connected");
        toast.success("Handshake da sessão concluído. Canal em tempo real ativo.");
      });

      socket.on(EVENT_ERROR, (payload: unknown) => {
        if (intentionalCloseRef.current) return;
        toast.error(formatSessionErrorPayload(payload));
        scheduleReconnect(EVENT_ERROR);
      });

      socket.on(EVENT_RECONNECTED, () => {
        if (intentionalCloseRef.current) return;
        toast.info("Sessão em tempo real reconectada.");
      });

      socket.on(EVENT_DISCONNECTED, () => {
        if (intentionalCloseRef.current) return;
        toast.error("Sessão em tempo real encerrada pelo servidor.");
        scheduleReconnect(EVENT_DISCONNECTED);
      });

      socket.on(EVENT_DISCONNECTED_TYPO, () => {
        if (intentionalCloseRef.current) return;
        toast.error("Sessão em tempo real encerrada pelo servidor.");
        scheduleReconnect(EVENT_DISCONNECTED_TYPO);
      });

      socket.on("disconnect", (reason: string) => {
        if (intentionalCloseRef.current) return;
        if (reason === "io client disconnect") return;
        toast.error(`Conexão em tempo real perdida: ${reason}.`);
        scheduleReconnect("disconnect");
      });

      socket.on("connect_error", (err: unknown) => {
        if (intentionalCloseRef.current) return;
        const detail =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "";
        toast.error(
          detail.length > 0
            ? `Falha ao conectar em tempo real: ${detail}`
            : "Falha ao conectar em tempo real."
        );
        scheduleReconnect("connect_error");
      });
    };

    connectSocket();

    return () => {
      intentionalCloseRef.current = true;
      reconnectPendingRef.current = false;
      clearRetryTimer();
      teardownSocket();
    };
  }, [
    isReady,
    isAuthenticated,
    accessToken,
    clearRetryTimer,
    teardownSocket,
  ]);

  const value = useMemo<SessionSocketContextValue>(
    () => ({
      uiState,
      isRealtimeReady: uiState === "connected",
      socket,
      handshakeEpoch,
      requestSessionHandshake,
    }),
    [uiState, socket, handshakeEpoch, requestSessionHandshake]
  );

  return (
    <SessionSocketContext.Provider value={value}>{children}</SessionSocketContext.Provider>
  );
}

export function useSessionSocket(): SessionSocketContextValue {
  const ctx = useContext(SessionSocketContext);
  if (!ctx) {
    throw new Error("useSessionSocket must be used within SessionSocketProvider");
  }
  return ctx;
}
