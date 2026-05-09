"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/toast/toaster";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  useWorkspaceEventsSocket,
  type WorkspaceSocketMessage,
} from "@/hooks/use-workspace-events-socket";
import { cn } from "@/lib/utils";
import {
  deleteWhatsappSession,
  listWhatsappSessionsByWorkspace,
  requestBaileysConnection,
  type WhatsappSessionRow,
  type Workspace,
} from "@/lib/workspace-client";

function extractQrString(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (typeof root.qr === "string" && root.qr.trim().length > 0) {
    return root.qr;
  }
  const nested = root.payload;
  if (nested && typeof nested === "object") {
    const qr = (nested as Record<string, unknown>).qr;
    if (typeof qr === "string" && qr.trim().length > 0) {
      return qr;
    }
  }
  return null;
}

function buildQrCodeUrl(qr: string): string {
  const encoded = encodeURIComponent(qr);
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encoded}`;
}

type Phase = "idle" | "requesting" | "awaiting_qr" | "qr_ready" | "success" | "error";

export function WorkspaceConnectionClient({ workspace }: { workspace: Workspace }) {
  const { accessToken, isReady } = useAuth();
  const workspaceId = workspace.id;

  const [phase, setPhase] = useState<Phase>("idle");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WhatsappSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<WhatsappSessionRow | null>(
    null
  );
  const [deletingSession, setDeletingSession] = useState(false);

  const hasAutoRequestedAfterSubscribeRef = useRef(false);

  const loadSessions = useCallback(async () => {
    if (!accessToken) return;
    setSessionsLoading(true);
    const tid = toast.loading("Carregando conexões…");
    try {
      const rows = await listWhatsappSessionsByWorkspace(accessToken, workspaceId);
      setSessions(rows);
      toast.success("Lista de conexões atualizada.", { id: tid });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível carregar as conexões.";
      toast.error(msg, { id: tid });
    } finally {
      setSessionsLoading(false);
    }
  }, [accessToken, workspaceId]);

  useEffect(() => {
    if (isReady && accessToken) {
      void loadSessions();
    }
  }, [isReady, accessToken, loadSessions]);

  const finishConnected = useCallback(() => {
    setPhase("success");
    setQrUrl(null);
    setErrorMessage(null);
    toast.success("WhatsApp conectado com sucesso.");
    void loadSessions();
  }, [loadSessions]);

  const handleSocketMessage = useCallback((message: WorkspaceSocketMessage) => {
    if (message.event !== "new-connection") return;
    const qr = extractQrString(message.payload);
    if (qr) {
      setQrUrl(buildQrCodeUrl(qr));
      setPhase("qr_ready");
      setErrorMessage(null);
      toast.success("QR Code disponível. Escaneie com o WhatsApp.");
    }
  }, []);

  const canRequestConnection = phase === "error" || phase === "success";

  const requestConnection = useCallback(async () => {
    if (!accessToken) {
      toast.error("Sessão inválida.");
      return;
    }
    setQrUrl(null);
    setErrorMessage(null);
    setPhase("requesting");
    const tid = toast.loading("Solicitando conexão…");
    try {
      await requestBaileysConnection(accessToken, workspaceId);
      setPhase("awaiting_qr");
      toast.success("Conexão solicitada. Aguarde o QR Code.", { id: tid });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível solicitar a conexão.";
      toast.error(msg, { id: tid });
      setErrorMessage(msg);
      setPhase("error");
    }
  }, [accessToken, workspaceId]);

  const handleSocketOpen = useCallback(() => {
    if (hasAutoRequestedAfterSubscribeRef.current) return;
    hasAutoRequestedAfterSubscribeRef.current = true;
    void requestConnection();
  }, [requestConnection]);

  const socketEnabled = Boolean(isReady && accessToken && workspaceId);

  useWorkspaceEventsSocket({
    workspaceId,
    enabled: socketEnabled,
    onMessage: handleSocketMessage,
    onConnected: () => {
      finishConnected();
    },
    onOpen: handleSocketOpen,
  });

  const requestButtonLabel =
    phase === "success" || phase === "error" ? "Solicitar novo QR Code" : "Solicitar QR Code";

  const onConfirmDeleteSession = async () => {
    if (!accessToken || !sessionPendingDelete) return;
    setDeletingSession(true);
    const tid = toast.loading("Removendo conexão…");
    try {
      await deleteWhatsappSession(accessToken, sessionPendingDelete.id);
      toast.success("Conexão removida.", { id: tid });
      setSessionPendingDelete(null);
      void loadSessions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível remover a conexão.";
      toast.error(msg, { id: tid });
    } finally {
      setDeletingSession(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col gap-6 overflow-auto p-4 md:min-h-[100dvh] md:p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
              Conexão WhatsApp
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              Workspace{" "}
              <span className="font-medium text-foreground">{workspace.name}</span>. Apenas o dono
              pode gerenciar conexões.
            </p>
          </div>
          <Button variant="outline" asChild className="w-full shrink-0 sm:w-auto">
            <Link href="/workspaces">Voltar à lista</Link>
          </Button>
        </div>

        <section
          className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
          aria-live="polite"
        >
          <h2 className="text-sm font-semibold text-foreground">Novo QR Code</h2>

          <div className="flex flex-col items-center gap-4">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code para conectar o WhatsApp a este workspace"
                className="h-64 w-64 rounded-md border border-border bg-white object-contain"
              />
            ) : (
              <div
                className={cn(
                  "flex h-64 w-64 items-center justify-center rounded-md border border-dashed border-border bg-muted/30",
                  "text-center text-sm text-muted-foreground"
                )}
              >
                {phase === "requesting" || phase === "awaiting_qr"
                  ? "Aguardando QR Code…"
                  : "Nenhum QR Code ativo. Solicite uma conexão."}
              </div>
            )}

            <Button
              type="button"
              className="w-full max-w-sm"
              disabled={!isReady || !accessToken || !canRequestConnection}
              onClick={() => void requestConnection()}
            >
              {phase === "requesting" ? "Solicitando…" : requestButtonLabel}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Abra o WhatsApp no celular, vá em <strong>Aparelhos conectados</strong>, toque em{" "}
            <strong>Conectar um aparelho</strong> e escaneie o QR Code acima.
          </p>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {phase === "success" ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Última conexão concluída com sucesso. Você pode solicitar outro QR Code para uma nova
              sessão, se precisar.
            </p>
          ) : null}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-foreground">Conexões deste workspace</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!accessToken || sessionsLoading}
              onClick={() => void loadSessions()}
            >
              Atualizar lista
            </Button>
          </div>

          {sessionsLoading ? (
            <p className="text-sm text-muted-foreground" role="status">
              Carregando…
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-pretty text-sm text-muted-foreground">
              Ainda não há nenhuma conexão registrada para este workspace. Após concluir o pareamento
              pelo QR Code, a sessão aparecerá aqui.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {sessions.map((row, index) => (
                <li
                  key={row.id ? `${row.id}-${index}` : `session-${index}`}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.label}</p>
                    <p className="text-sm text-muted-foreground">Status: {row.status}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setSessionPendingDelete(row)}
                  >
                    Remover conexão
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {sessionPendingDelete ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-delete-title"
          aria-describedby="session-delete-desc"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <h2 id="session-delete-title" className="text-lg font-semibold text-foreground">
              Remover conexão
            </h2>
            <p id="session-delete-desc" className="mt-2 text-sm text-muted-foreground">
              A conexão <span className="font-medium text-foreground">{sessionPendingDelete.label}</span>{" "}
              será removida. Isso não pode ser desfeito; será necessário refazer o pareamento pelo QR
              Code para usar este aparelho de novo.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSessionPendingDelete(null)}
                disabled={deletingSession}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void onConfirmDeleteSession()}
                disabled={deletingSession}
              >
                {deletingSession ? "Removendo…" : "Remover"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
