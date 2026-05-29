"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { toast } from "@/components/toast/toaster";
import { useAuth } from "@/contexts/auth-context";
import { useSessionSocket } from "@/contexts/session-socket-context";
import { useWorkspaceRooms } from "@/hooks/use-workspace-rooms";
import { cn } from "@/lib/utils";
import {
  deleteWorkspace,
  isWorkspaceOwner,
  listWorkspaces,
  type Workspace,
} from "@/lib/workspace-client";

const PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.415 9.415a1 1 0 0 1-.394.243l-3 1a1 1 0 0 1-1.265-1.265l1-3a1 1 0 0 1 .243-.394z" />
    </svg>
  );
}

function PlugIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 22v-6" />
      <path d="M9 8V2h2v6" />
      <path d="M15 8V2h2v6" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border/40">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
          </td>
          <td className="px-4 py-3" />
        </tr>
      ))}
    </>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function WorkspacesList() {
  const { accessToken, user, isReady } = useAuth();
  const { isRealtimeReady } = useSessionSocket();
  const userSub = typeof user?.sub === "string" ? user.sub : undefined;
  const ownerIdForList =
    typeof user?.userOwnerId === "string" && user.userOwnerId.length > 0
      ? user.userOwnerId
      : userSub;

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Workspace[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspacePendingDelete, setWorkspacePendingDelete] = useState<Workspace | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const load = useCallback(async () => {
    if (!isReady) return;
    if (!accessToken) { setLoading(false); setItems([]); setTotal(0); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await listWorkspaces(accessToken, {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        ...(ownerIdForList ? { ownerId: ownerIdForList } : {}),
      });
      setItems(res.items);
      setTotal(res.total > 0 ? res.total : res.items.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível carregar empresas.";
      setError(msg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [isReady, accessToken, page, debouncedSearch, ownerIdForList]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const workspaceIdsForRooms = useMemo(
    () => items.map((w) => w.id).filter((id) => id.trim().length > 0),
    [items]
  );

  useWorkspaceRooms(
    !loading && accessToken && isReady && isRealtimeReady && workspaceIdsForRooms.length > 0
      ? workspaceIdsForRooms
      : []
  );

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const onDelete = useCallback(async () => {
    if (!accessToken || !workspacePendingDelete) return;
    setDeleting(true);
    const tid = toast.loading("Excluindo empresa…");
    try {
      await deleteWorkspace(accessToken, workspacePendingDelete.id);
      toast.success("Empresa excluída.", { id: tid });
      setWorkspacePendingDelete(null);
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao excluir.";
      toast.error(msg, { id: tid });
    } finally {
      setDeleting(false);
    }
  }, [accessToken, workspacePendingDelete, load]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Empresas</h1>
          {!loading && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {total} {total === 1 ? "empresa" : "empresas"}
            </p>
          )}
        </div>
        <Link
          href="/workspaces/new"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sidebar-primary px-3 text-sm font-medium text-sidebar-primary-foreground transition-opacity hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14" /><path d="M12 5v14" />
          </svg>
          Nova empresa
        </Link>
      </div>

      {/* Search */}
      <div className="px-6 pb-4">
        <Input
          id="workspace-search"
          type="search"
          placeholder="Pesquisar empresa…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          autoComplete="off"
          className="max-w-xs rounded-lg border border-border/60 bg-input text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-sidebar-primary"
        />
      </div>

      {error ? (
        <p className="px-6 text-sm text-destructive" role="alert">{error}</p>
      ) : null}

      {/* Table area */}
      {!loading && items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <img
            src="/undraw/closer.svg"
            alt=""
            className="max-h-40 w-full max-w-[240px] object-contain"
            width={240}
            height={160}
            decoding="async"
          />
          <div className="max-w-md space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {debouncedSearch.trim() ? "Nenhuma empresa encontrada" : "Comece pela sua primeira empresa"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch.trim()
                ? "Tente outro termo de busca ou cadastre uma nova empresa."
                : "Crie uma empresa para organizar atendimentos e conectar o WhatsApp ao seu time."}
            </p>
          </div>
          <Link
            href="/workspaces/new"
            className="inline-flex h-9 items-center rounded-lg bg-sidebar-primary px-4 text-sm font-medium text-sidebar-primary-foreground transition-opacity hover:opacity-90"
          >
            {debouncedSearch.trim() ? "Nova empresa" : "Registrar primeira empresa"}
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-border/50 bg-card/80 backdrop-blur-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome
                  </th>
                  <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Documento
                  </th>
                  <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Criada em
                  </th>
                  <th scope="col" className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th scope="col" className="w-[1%] whitespace-nowrap px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : (
                  items.map((row, index) => {
                    const owner = isWorkspaceOwner(row, ownerIdForList ?? userSub);
                    return (
                      <tr
                        key={row.id ? `${row.id}-${index}` : `workspace-row-${index}`}
                        className="group border-b border-border/40 last:border-0 hover:bg-foreground/[0.04]"
                      >
                        {/* Name */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/workspaces/${encodeURIComponent(row.id)}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: row.customInterface.color }}
                            >
                              {initials(row.name)}
                            </span>
                            <span className="font-medium text-foreground">{row.name}</span>
                          </Link>
                        </td>

                        {/* Document */}
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {row.document || "—"}
                        </td>

                        {/* Created at */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {dateFormatter.format(new Date(row.createdAt))}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                              row.isActive
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                row.isActive ? "bg-emerald-400" : "bg-muted-foreground"
                              )}
                            />
                            {row.isActive ? "Ativa" : "Inativa"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            {owner ? (
                              <Link
                                href={`/workspaces/${encodeURIComponent(row.id)}/edit`}
                                title="Editar workspace"
                                aria-label={`Editar workspace ${row.name}`}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                              >
                                <PencilIcon />
                              </Link>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Apenas o dono pode editar este workspace"
                                className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/30"
                              >
                                <PencilIcon />
                              </button>
                            )}

                            {owner ? (
                              <Link
                                href={`/workspaces/${encodeURIComponent(row.id)}/connect`}
                                title="Conectar WhatsApp"
                                aria-label={`Conectar WhatsApp ao workspace ${row.name}`}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                              >
                                <PlugIcon />
                              </Link>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Apenas o dono pode conectar o WhatsApp"
                                className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/30"
                              >
                                <PlugIcon />
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={!owner}
                              title={owner ? "Excluir workspace" : "Apenas o dono pode excluir este workspace"}
                              aria-label={owner ? `Excluir workspace ${row.name}` : "Exclusão disponível apenas para o dono do workspace"}
                              onClick={() => { if (owner) setWorkspacePendingDelete(row); }}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                                owner
                                  ? "text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                                  : "cursor-not-allowed text-muted-foreground/30"
                              )}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/40 px-6 py-3">
            <p className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages}
              {total > 0 && (
                <span className="ml-1">
                  · {total} {total === 1 ? "registro" : "registros"}
                </span>
              )}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-7 items-center rounded-md border border-border/60 bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-7 items-center rounded-md border border-border/60 bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {workspacePendingDelete ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-delete-title"
          aria-describedby="workspace-delete-description"
        >
          <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-5 shadow-2xl">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <TrashIcon className="text-red-400" />
            </div>
            <h2 id="workspace-delete-title" className="mt-3 text-base font-semibold text-foreground">
              Confirmar exclusão
            </h2>
            <p id="workspace-delete-description" className="mt-1.5 text-sm text-muted-foreground">
              Você tem certeza que deseja excluir a empresa{" "}
              <span className="font-medium text-foreground">{workspacePendingDelete.name}</span>?{" "}
              Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex gap-2.5 sm:justify-end">
              <button
                type="button"
                onClick={() => setWorkspacePendingDelete(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50 sm:flex-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void onDelete()}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50 sm:flex-none"
              >
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
