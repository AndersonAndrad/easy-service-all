"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { WorkspaceConnectionClient } from "@/components/workspaces/workspace-connection-client";
import { useAuth } from "@/contexts/auth-context";
import { getWorkspace, isWorkspaceOwner, type Workspace } from "@/lib/workspace-client";

export default function WorkspaceConnectPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { accessToken, user, isReady } = useAuth();
  const userSub = typeof user?.sub === "string" ? user.sub : undefined;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isReady) return;
    if (!accessToken || !id) {
      setLoading(false);
      setWorkspace(null);
      setLoadError(!accessToken ? "Sessão inválida." : "Identificador inválido.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const ws = await getWorkspace(accessToken, id);
      setWorkspace(ws);
      if (!ws) setLoadError("Workspace não encontrado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível carregar.";
      setLoadError(msg);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, accessToken, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const owner = workspace ? isWorkspaceOwner(workspace, userSub) : false;

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center p-4 md:h-[100dvh]">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!workspace || loadError) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-4 p-4 md:h-[100dvh] md:p-6">
        <p className="text-destructive" role="alert">
          {loadError ?? "Workspace não encontrado."}
        </p>
        <Button asChild variant="outline">
          <Link href="/workspaces">Voltar à lista</Link>
        </Button>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-4 p-4 md:h-[100dvh] md:p-6">
        <h1 className="text-2xl font-semibold text-foreground">Conexão WhatsApp</h1>
        <p className="text-muted-foreground">
          Apenas o dono deste workspace pode gerenciar conexões do WhatsApp.
        </p>
        <Button asChild variant="outline">
          <Link href="/workspaces">Voltar à lista</Link>
        </Button>
      </div>
    );
  }

  return <WorkspaceConnectionClient workspace={workspace} />;
}
