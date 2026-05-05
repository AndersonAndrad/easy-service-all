"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.415 9.415a1 1 0 0 1-.394.243l-3 1a1 1 0 0 1-1.265-1.265l1-3a1 1 0 0 1 .243-.394z" />
    </svg>
  );
}

function PlugIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 22v-6" />
      <path d="M9 8V2h2v6" />
      <path d="M15 8V2h2v6" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
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
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    if (!isReady) return;
    if (!accessToken) {
      setLoading(false);
      setItems([]);
      setTotal(0);
      return;
    }
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
      const msg = e instanceof Error ? e.message : "Não foi possível carregar workspaces.";
      setError(msg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [isReady, accessToken, page, debouncedSearch, ownerIdForList]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  const workspaceIdsForRooms = useMemo(
    () => items.map((w) => w.id).filter((id) => id.trim().length > 0),
    [items]
  );

  useWorkspaceRooms(
    !loading && accessToken && isReady && isRealtimeReady && workspaceIdsForRooms.length > 0
      ? workspaceIdsForRooms
      : []
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onDelete = useCallback(async () => {
    if (!accessToken || !workspacePendingDelete) return;
    setDeleting(true);
    const tid = toast.loading("Excluindo workspace…");
    try {
      await deleteWorkspace(accessToken, workspacePendingDelete.id);
      toast.success("Workspace excluído.", { id: tid });
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            Workspaces
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Visualize e gerencie os workspaces aos quais você tem acesso. Apenas o dono pode
            conectar o WhatsApp, editar ou excluir um workspace.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/workspaces/new">Novo workspace</Link>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="workspace-search">
            Pesquisar por nome
          </label>
          <Input
            id="workspace-search"
            type="search"
            placeholder="Digite o nome do workspace"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
            className="max-w-md"
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div
            className={cn(
              "flex min-h-[240px] flex-1 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 shadow-sm",
              "md:min-h-0"
            )}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-muted-foreground">Carregando workspaces…</p>
          </div>
        ) : items.length === 0 ? (
          <div
            className={cn(
              "flex min-h-[280px] flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm",
              "md:min-h-[320px]"
            )}
          >
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
                {debouncedSearch.trim()
                  ? "Nenhum workspace encontrado"
                  : "Comece pelo seu primeiro workspace"}
              </h2>
              <p className="text-pretty text-sm text-muted-foreground">
                {debouncedSearch.trim()
                  ? "Tente outro termo de busca ou cadastre um novo workspace."
                  : "Crie um workspace para organizar atendimentos e conectar o WhatsApp ao seu time."}
              </p>
            </div>
            <Button asChild>
              <Link href="/workspaces/new">
                {debouncedSearch.trim() ? "Novo workspace" : "Registrar primeiro workspace"}
              </Link>
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm",
              "min-h-[240px] md:min-h-0"
            )}
          >
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-[1] border-b border-border bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium text-foreground">
                      Nome
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-foreground">
                      Documento
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-foreground">
                      Criada em
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-foreground">
                      Status
                    </th>
                    <th scope="col" className="w-[1%] whitespace-nowrap px-4 py-3 text-end font-medium text-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, index) => {
                    const owner = isWorkspaceOwner(row, ownerIdForList ?? userSub);
                    return (
                      <tr
                        key={row.id ? `${row.id}-${index}` : `workspace-row-${index}`}
                        className="border-b border-border/80 last:border-0 hover:bg-accent/40"
                      >
                        <td className="max-w-[200px] truncate px-4 py-3 font-medium text-foreground">
                          <Link
                            href={`/workspaces/${encodeURIComponent(row.id)}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: row.customInterface.color }}
                            />
                            {row.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.document || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {dateFormatter.format(new Date(row.createdAt))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              row.isActive
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {row.isActive ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="hover:bg-accent"
                              disabled={!owner}
                              title={
                                owner
                                  ? "Editar workspace"
                                  : "Apenas o dono pode editar este workspace"
                              }
                              asChild={owner}
                              aria-label={
                                owner
                                  ? `Editar workspace ${row.name}`
                                  : "Edição disponível apenas para o dono do workspace"
                              }
                            >
                              {owner ? (
                                <Link
                                  href={`/workspaces/${encodeURIComponent(row.id)}/edit`}
                                >
                                  <PencilIcon />
                                </Link>
                              ) : (
                                <span aria-hidden>
                                  <PencilIcon />
                                </span>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="hover:bg-accent"
                              disabled={!owner}
                              title={
                                owner
                                  ? "Conectar WhatsApp"
                                  : "Apenas o dono pode conectar o WhatsApp"
                              }
                              asChild={owner}
                              aria-label={
                                owner
                                  ? `Conectar WhatsApp ao workspace ${row.name}`
                                  : "Conexão disponível apenas para o dono do workspace"
                              }
                            >
                              {owner ? (
                                <Link
                                  href={`/workspaces/${encodeURIComponent(row.id)}/connect`}
                                >
                                  <PlugIcon />
                                </Link>
                              ) : (
                                <span aria-hidden>
                                  <PlugIcon />
                                </span>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="hover:bg-accent"
                              disabled={!owner}
                              title={
                                owner
                                  ? "Excluir workspace"
                                  : "Apenas o dono pode excluir este workspace"
                              }
                              onClick={() => {
                                if (owner) {
                                  setWorkspacePendingDelete(row);
                                }
                              }}
                              aria-label={
                                owner
                                  ? `Excluir workspace ${row.name}`
                                  : "Exclusão disponível apenas para o dono do workspace"
                              }
                            >
                              <TrashIcon />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
                {total > 0 ? (
                  <span className="ms-1">
                    ({total} {total === 1 ? "registro" : "registros"})
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {workspacePendingDelete ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-delete-title"
          aria-describedby="workspace-delete-description"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <h2 id="workspace-delete-title" className="text-lg font-semibold text-foreground">
              Confirmar exclusão
            </h2>
            <p id="workspace-delete-description" className="mt-2 text-sm text-muted-foreground">
              Você tem certeza que deseja excluir o workspace{" "}
              <span className="font-medium text-foreground">{workspacePendingDelete.name}</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWorkspacePendingDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={() => void onDelete()}>
                {deleting ? "Excluindo…" : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
