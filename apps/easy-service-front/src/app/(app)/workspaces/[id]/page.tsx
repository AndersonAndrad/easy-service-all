"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getWorkspace, isWorkspaceOwner, type Workspace } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

type ActionCardProps = {
  href: string;
  disabled?: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
};

function ActionCard({ href, disabled, title, description, icon }: ActionCardProps) {
  const inner = (
    <div className={cn(
      "flex items-start gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors",
      disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/50 hover:border-primary/30"
    )}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0 text-muted-foreground" aria-hidden>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </div>
  );

  if (disabled) return inner;
  return <Link href={href}>{inner}</Link>;
}

export default function WorkspaceDetailPage() {
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
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }, [isReady, accessToken, id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center md:h-[100dvh]">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!workspace || loadError) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-4 p-4 md:h-[100dvh] md:p-6">
        <p className="text-destructive" role="alert">{loadError ?? "Workspace não encontrado."}</p>
        <Button asChild variant="outline"><Link href="/workspaces">Voltar à lista</Link></Button>
      </div>
    );
  }

  const owner = isWorkspaceOwner(workspace, userSub);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-auto p-4 md:h-[100dvh] md:p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="size-4 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background"
            style={{ backgroundColor: workspace.customInterface.color }}
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{workspace.name}</h1>
            <span className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
              workspace.isActive
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                : "bg-muted text-muted-foreground"
            )}>
              {workspace.isActive ? "Ativa" : "Inativa"}
            </span>
          </div>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link href="/workspaces">← Voltar à lista</Link>
        </Button>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex flex-col gap-4 sm:grid sm:grid-cols-3">
        <InfoRow label="Documento" value={workspace.document || "—"} />
        <InfoRow
          label="Criado em"
          value={dateFormatter.format(new Date(workspace.createdAt))}
        />
        <InfoRow label="ID" value={workspace.id} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Ações</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/contacts"
            title="Contatos"
            description="Visualize e gerencie os contatos deste workspace."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <ActionCard
            href={`/workspaces/${encodeURIComponent(id)}/edit`}
            disabled={!owner}
            title="Editar workspace"
            description={owner ? "Altere nome, documento e aparência." : "Apenas o dono pode editar."}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.415 9.415a1 1 0 0 1-.394.243l-3 1a1 1 0 0 1-1.265-1.265l1-3a1 1 0 0 1 .243-.394z" />
              </svg>
            }
          />
          <ActionCard
            href={`/workspaces/${encodeURIComponent(id)}/connect`}
            disabled={!owner}
            title="Conectar WhatsApp"
            description={owner ? "Escaneie o QR Code para vincular um número." : "Apenas o dono pode conectar."}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 22v-6" />
                <path d="M9 8V2h2v6" />
                <path d="M15 8V2h2v6" />
                <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
              </svg>
            }
          />
        </div>
      </div>
      </div>
    </div>
  );
}
