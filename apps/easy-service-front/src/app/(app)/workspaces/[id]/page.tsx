"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { getWorkspace, isWorkspaceOwner, type Workspace } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</span>
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
      "group flex cursor-pointer items-start gap-4 rounded-xl bg-card/60 p-5 transition-colors",
      disabled ? "cursor-not-allowed opacity-40" : "hover:bg-card"
    )}>
      <div className={cn(
        "mt-0.5 shrink-0 rounded-lg p-2.5 transition-colors",
        disabled
          ? "bg-muted text-muted-foreground"
          : "bg-sidebar-primary/10 text-sidebar-primary group-hover:bg-sidebar-primary/20"
      )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{description}</p>
      </div>
      {!disabled && (
        <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0 text-muted-foreground/40" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </div>
  );

  if (disabled) return inner;
  return <Link href={href}>{inner}</Link>;
}

export default function WorkspaceDetailPage() {
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
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }, [isReady, accessToken, id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center md:h-[100dvh]">
        <p className="text-sm text-muted-foreground">Carregando…</p>
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

  const owner = isWorkspaceOwner(workspace, userSub);

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
          <span className="text-foreground/80">{workspace.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background"
            style={{ backgroundColor: workspace.customInterface.color }}
          />
          <h1 className="text-xl font-semibold text-foreground">{workspace.name}</h1>
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
            workspace.isActive
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", workspace.isActive ? "bg-emerald-400" : "bg-muted-foreground")} />
            {workspace.isActive ? "Ativa" : "Inativa"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Info grid */}
        <div className="mb-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-primary/80">Informações</span>
            <span className="h-px flex-1 bg-border/40" />
          </div>
          <div className="grid gap-4 rounded-xl bg-card/50 p-5 sm:grid-cols-3">
            <InfoRow label="Documento" value={workspace.document || "—"} />
            <InfoRow label="Criada em" value={dateFormatter.format(new Date(workspace.createdAt))} />
            <InfoRow label="ID" value={workspace.id} />
          </div>
        </div>

        {/* Actions */}
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-primary/80">Ações</span>
            <span className="h-px flex-1 bg-border/40" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              href="/contacts"
              title="Contatos"
              description="Visualize e gerencie os contatos desta empresa."
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
              title="Editar empresa"
              description={owner ? "Altere nome, documento e aparência." : "Apenas o dono pode editar."}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
