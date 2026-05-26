"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
      if (!ws) setLoadError("Empresa não encontrada.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível carregar.";
      setLoadError(msg);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, accessToken, id]);

  useEffect(() => { void load(); }, [load]);

  const owner = workspace ? isWorkspaceOwner(workspace, userSub) : false;

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center md:h-[100dvh]">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!workspace || loadError) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-4 p-6 md:h-[100dvh]">
        <p className="text-destructive" role="alert">{loadError ?? "Empresa não encontrada."}</p>
        <button
          type="button"
          onClick={() => router.push("/workspaces")}
          className="inline-flex h-9 w-fit cursor-pointer items-center rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          Voltar à lista
        </button>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-4 p-6 md:h-[100dvh]">
        <h1 className="text-xl font-semibold text-foreground">Empresa</h1>
        <p className="text-sm text-muted-foreground">Apenas o dono desta empresa pode editá-la.</p>
        <button
          type="button"
          onClick={() => router.push("/workspaces")}
          className="inline-flex h-9 w-fit cursor-pointer items-center rounded-lg border border-border/60 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          Voltar à lista
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-[100dvh]">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground/60">
          <button
            type="button"
            onClick={() => router.push("/workspaces")}
            className="cursor-pointer transition-colors hover:text-muted-foreground"
          >
            Empresas
          </button>
          <span>/</span>
          <span className="text-foreground/80">Editar empresa</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Editar empresa</h1>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          Atualizando dados de{" "}
          <span className="font-medium text-foreground/80">{workspace.name}</span>.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
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
                toast.success("Empresa atualizada.", { id: tid });
                router.push("/workspaces");
                router.refresh();
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Não foi possível salvar.";
                toast.error(msg, { id: tid });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
