"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Client, Notation } from "@/lib/chat-client";
import type { Workspace } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";

// ─── Conversation Info ────────────────────────────────────────────────────────

type ConversationInfoProps = {
  chatName?: string;
  onRenameChatName?: (name: string) => Promise<void>;
};

function ConversationInfo({ chatName, onRenameChatName }: ConversationInfoProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setValue(chatName ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!value.trim() || !onRenameChatName) return;
    setSaving(true);
    setError(null);
    try {
      await onRenameChatName(value.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
          Nome do chat
        </span>
        {onRenameChatName && !editing && (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Editar nome do chat"
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            placeholder="Nome do chat…"
            className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !value.trim()}
              className="h-6 px-2 text-xs"
            >
              {saving ? "…" : "Salvar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="h-6 px-2 text-xs"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <span className={cn("text-sm", chatName ? "text-foreground" : "text-muted-foreground italic")}>
          {chatName ?? "Não definido"}
        </span>
      )}
    </div>
  );
}

// ─── Client Info ──────────────────────────────────────────────────────────────

function ClientInfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

type ClientInfoProps = {
  client: Client | null;
  isLoading: boolean;
  onRenameClient?: (name: string) => Promise<void>;
};

function ClientInfo({ client, isLoading, onRenameClient }: ClientInfoProps) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setNameValue(client?.name ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!nameValue.trim() || !onRenameClient) return;
    setSaving(true);
    setError(null);
    try {
      await onRenameClient(nameValue.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div
          className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Carregando cliente"
        />
      </div>
    );
  }

  if (!client) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhum cliente vinculado
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
            Nome
          </span>
          {onRenameClient && !editing && (
            <button
              type="button"
              onClick={startEdit}
              aria-label="Editar nome"
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-1.5">
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || !nameValue.trim()}
                className="h-6 px-2 text-xs"
              >
                {saving ? "…" : "Salvar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="h-6 px-2 text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <span className="text-sm text-foreground">{client.name ?? "—"}</span>
        )}
      </div>

      <ClientInfoRow label="Telefone" value={client.phone} />
      <ClientInfoRow label="Documento" value={client.document} />
    </div>
  );
}

// ─── Notation Item ────────────────────────────────────────────────────────────

const NOTATION_EDIT_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 h

function canEditNotation(notation: Notation, currentUserId: string): boolean {
  if (notation.ownerId !== currentUserId) return false;
  const age = Date.now() - notation.createdAt.getTime();
  return age <= NOTATION_EDIT_LIMIT_MS;
}

function canDeleteNotation(notation: Notation, currentUserId: string): boolean {
  return notation.ownerId === currentUserId;
}

type NotationItemProps = {
  notation: Notation;
  currentUserId: string;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function NotationItem({ notation, currentUserId, onUpdate, onDelete }: NotationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(notation.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = canEditNotation(notation, currentUserId);
  const deletable = canDeleteNotation(notation, currentUserId);

  const createdDate = notation.createdAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleSave() {
    if (!editContent.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdate(notation.id, editContent.trim());
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(notation.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir.");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full resize-none rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setIsEditing(false); setEditContent(notation.content); }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !editContent.trim()}
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm">{notation.content}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[0.6875rem] text-muted-foreground">{createdDate}</span>
            {(editable || deletable) && (
              <div className="flex gap-1">
                {editable && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    aria-label="Editar notação"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                {deletable && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        aria-label="Excluir notação"
                        disabled={deleting}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir notação</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A notação será removida permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => void handleDelete()}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}

// ─── New Notation Form ────────────────────────────────────────────────────────

type NewNotationFormProps = {
  onCreate: (content: string) => Promise<void>;
};

function NewNotationForm({ onCreate }: NewNotationFormProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(content.trim());
      setContent("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar notação.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
        <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nova notação
      </Button>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva sua notação..."
        rows={3}
        autoFocus
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setOpen(false); setContent(""); setError(null); }}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={saving || !content.trim()}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("text-muted-foreground transition-transform", open ? "rotate-180" : "")}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

// ─── Save as Contact ──────────────────────────────────────────────────────────

type SaveAsContactProps = {
  client: Client;
  workspaces: Workspace[];
  onSave: (workspaceId: string, phone: string, name?: string) => Promise<void>;
};

function SaveAsContact({ client, workspaces, onSave }: SaveAsContactProps) {
  const [open, setOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(
    client.workspaceId || workspaces[0]?.id || ""
  );
  const [name, setName] = useState(client.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        Contato salvo com sucesso.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mr-1.5">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 11v2" />
          <path d="M12 17h.01" />
        </svg>
        Salvar como contato
      </Button>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(workspaceId, client.phone, name.trim() || undefined);
      setSaved(true);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar contato.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background";

  return (
    <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-2">
      {workspaces.length > 1 && (
        <div>
          <label className="block text-[0.6875rem] font-medium text-muted-foreground mb-0.5">
            Workspace
          </label>
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className={inputClass}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-[0.6875rem] font-medium text-muted-foreground mb-0.5">
          Telefone
        </label>
        <input
          type="text"
          value={client.phone}
          disabled
          className={cn(inputClass, "opacity-60 cursor-not-allowed")}
        />
      </div>
      <div>
        <label className="block text-[0.6875rem] font-medium text-muted-foreground mb-0.5">
          Nome
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do contato"
          className={inputClass}
          autoFocus
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-1.5 justify-end">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={saving}
          className="h-6 px-2 text-xs"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={saving}
          className="h-6 px-2 text-xs"
        >
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

// ─── Details Panel ────────────────────────────────────────────────────────────

type DetailsPanelProps = {
  chatName?: string;
  client: Client | null;
  isLoadingClient: boolean;
  notations: Notation[];
  currentUserId: string;
  workspaces: Workspace[];
  onClose: () => void;
  onRenameChatName?: (name: string) => Promise<void>;
  onRenameClient?: (name: string) => Promise<void>;
  onSaveAsContact?: (workspaceId: string, phone: string, name?: string) => Promise<void>;
  onCreateNotation: (content: string) => Promise<void>;
  onUpdateNotation: (id: string, content: string) => Promise<void>;
  onDeleteNotation: (id: string) => Promise<void>;
};

export function DetailsPanel({
  chatName,
  client,
  isLoadingClient,
  notations,
  currentUserId,
  workspaces,
  onClose,
  onRenameChatName,
  onRenameClient,
  onSaveAsContact,
  onCreateNotation,
  onUpdateNotation,
  onDeleteNotation,
}: DetailsPanelProps) {
  return (
    <aside className="scroll-pretty flex w-[30%] min-w-[260px] max-w-[480px] shrink-0 flex-col overflow-y-auto border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Detalhes</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar detalhes"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <Section title="Conversa">
        <ConversationInfo
          chatName={chatName}
          onRenameChatName={onRenameChatName}
        />
      </Section>

      <Section title="Cliente">
        <ClientInfo
          client={client}
          isLoading={isLoadingClient}
          onRenameClient={onRenameClient}
        />
        {client && onSaveAsContact && workspaces.length > 0 && (
          <div className="px-4 pb-2">
            <SaveAsContact
              client={client}
              workspaces={workspaces}
              onSave={onSaveAsContact}
            />
          </div>
        )}
      </Section>

      <Section title="Notações">
        <div className="flex flex-col gap-2 px-4">
          {notations.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">Nenhuma notação</p>
          ) : (
            notations.map((n) => (
              <NotationItem
                key={n.id}
                notation={n}
                currentUserId={currentUserId}
                onUpdate={onUpdateNotation}
                onDelete={onDeleteNotation}
              />
            ))
          )}
          <NewNotationForm onCreate={onCreateNotation} />
        </div>
      </Section>
    </aside>
  );
}
