"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import { toast } from "@/components/toast/toaster";
import { useAuth } from "@/contexts/auth-context";
import {
  getWorkspace,
  isWorkspaceOwner,
  updateWorkspace,
  type Workspace,
} from "@/lib/workspace-client";

export default function EditWorkspacePage() {
  const params = useParams();
  const router = useRouter();
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
        <h1 className="text-2xl font-semibold text-foreground">Workspace</h1>
        <p className="text-muted-foreground">
          Apenas o dono deste workspace pode editá-lo.
        </p>
        <Button asChild variant="outline">
          <Link href="/workspaces">Voltar à lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-6 overflow-auto p-4 md:h-[100dvh] md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            Editar workspace
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Atualize os dados do workspace{" "}
            <span className="font-medium text-foreground">{workspace.name}</span>.
          </p>
        </div>
        <Button variant="outline" asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/workspaces">Voltar à lista</Link>
        </Button>
      </div>

      <WorkspaceForm
        initialValues={{
          name: workspace.name,
          document: workspace.document,
          customInterface: workspace.customInterface,
          isActive: workspace.isActive,
        }}
        submitLabel="Salvar alterações"
        onSubmit={async (body) => {
          if (!accessToken) {
            toast.error("Sessão inválida. Entre novamente.");
            return;
          }
          const tid = toast.loading("Salvando…");
          try {
            await updateWorkspace(accessToken, id, body);
            toast.success("Workspace atualizado.", { id: tid });
            router.push("/workspaces");
            router.refresh();
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Não foi possível salvar.";
            toast.error(msg, { id: tid });
          }
        }}
      />
    </div>
  );
}
