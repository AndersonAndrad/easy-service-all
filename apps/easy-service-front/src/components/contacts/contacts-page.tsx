"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "@/components/toast/toaster";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import type { Contact, ContactUpdateBody } from "@/lib/contact-client";
import {
  contactDisplayName,
  createWorkspaceContact,
  deleteWorkspaceContact,
  importWorkspaceContact,
  listWorkspaceContacts,
  updateWorkspaceContact,
} from "@/lib/contact-client";
import type { Workspace } from "@/lib/workspace-client";
import { listWorkspaces } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";

// ─── Phone formatter ──────────────────────────────────────────────────────────

function formatBrazilianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Strip country code 55 only when the result would be 10 or 11 digits
  const local =
    digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
      ? digits.slice(2)
      : digits;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return raw; // not a Brazilian number — show as-is
}

// ─── Workspace selector ───────────────────────────────────────────────────────

const ALL_WS = "__all__";

function WorkspaceSelector({
  workspaces,
  selectedId,
  isLoading,
  onSelect,
}: {
  workspaces: Workspace[];
  selectedId: string;
  isLoading: boolean;
  onSelect: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground">Carregando workspaces…</span>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs text-muted-foreground">Nenhum workspace disponível.</p>
      </div>
    );
  }

  const chip = (id: string, label: React.ReactNode, color?: string) => (
    <button
      key={id}
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
        selectedId === id
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
      )}
    >
      {color && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
      <span className="text-xs font-medium text-muted-foreground shrink-0">Workspace:</span>
      {chip(ALL_WS, "Todos")}
      {workspaces.map((ws) => chip(ws.id, ws.name, ws.customInterface.color))}
    </div>
  );
}

// ─── Contact card ─────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  workspaceColor,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  workspaceColor?: string;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayName = contactDisplayName(contact);
  const initials =
    displayName
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden transition-all cursor-pointer select-none",
        isSelected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/40 hover:shadow-md"
      )}
      onClick={onSelect}
    >
      {/* Workspace color bar */}
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: workspaceColor ?? "transparent" }} />

      {/* Horizontal layout: avatar left, name + phone right */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-[0.6875rem] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground leading-tight">{displayName}</p>
          <p className="truncate text-[0.6875rem] text-muted-foreground leading-tight mt-0.5">
            {formatBrazilianPhone(contact.phone)}
          </p>
        </div>
      </div>

      {/* Action buttons — visible only when card is clicked (selected) */}
      {isSelected && (
        <div
          className="flex items-center border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Editar contato"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[0.6875rem] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </button>

          <div className="h-4 w-px bg-border" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Excluir contato"
                className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[0.6875rem] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Excluir
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir contato</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{displayName}</strong>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

// ─── Contact form ─────────────────────────────────────────────────────────────

type FormValues = { phone: string; name: string; alias: string; email: string; notes: string };

function ContactForm({
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: Partial<Contact>;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ phone: phone.trim(), name: name.trim(), alias: alias.trim(), email: email.trim(), notes: notes.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar contato.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background placeholder:text-muted-foreground";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-4">
      <div>
        <label className={labelClass}>Telefone *</label>
        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-9999" required disabled={mode === "edit"} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Nome</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Apelido</label>
        <input type="text" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Apelido" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Observações</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações sobre o contato…" rows={3} className={cn(inputClass, "resize-none")} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving || !phone.trim()}>
          {saving ? "Salvando…" : mode === "create" ? "Criar contato" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

// ─── Import form ──────────────────────────────────────────────────────────────

function ImportForm({ onSubmit, onCancel }: { onSubmit: (contactId: string) => Promise<void>; onCancel: () => void }) {
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(contactId.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar contato.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 p-4">
      <p className="text-xs text-muted-foreground">
        Informe o ID de um contato de outro workspace para importá-lo.
      </p>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">ID do contato *</label>
        <input type="text" value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="Ex.: 6650a3f2c4d7890012345678" required autoFocus className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background placeholder:text-muted-foreground" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={saving || !contactId.trim()}>
          {saving ? "Importando…" : "Importar"}
        </Button>
      </div>
    </form>
  );
}

// ─── Contact detail ───────────────────────────────────────────────────────────

function ContactDetail({
  contact,
  workspaceName,
  workspaceColor,
  onEdit,
  onClose,
}: {
  contact: Contact;
  workspaceName?: string;
  workspaceColor?: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  const Row = ({ label, value }: { label: string; value?: string }) => {
    if (!value) return null;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground break-all">{value}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Detalhes do contato</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEdit} aria-label="Editar" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        {workspaceName && (
          <div className="flex items-center gap-2">
            {workspaceColor && <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: workspaceColor }} />}
            <span className="text-xs font-medium text-muted-foreground">{workspaceName}</span>
          </div>
        )}
        <Row label="Nome" value={contact.name} />
        <Row label="Apelido" value={contact.alias} />
        <Row label="Telefone" value={formatBrazilianPhone(contact.phone)} />
        <Row label="E-mail" value={contact.email} />
        <Row label="Observações" value={contact.notes} />
        {contact.sharedFromId && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">Importado de</span>
            <span className="text-xs text-muted-foreground font-mono break-all">{contact.sharedFromId}</span>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">Criado em</span>
          <span className="text-xs text-muted-foreground">
            {contact.createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">ID</span>
          <span className="text-xs text-muted-foreground font-mono break-all">{contact._id}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PanelMode =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; contact: Contact }
  | { type: "import" }
  | { type: "detail"; contact: Contact };

const PAGE_SIZE = 30;

export function ContactsPage() {
  const { user, accessToken } = useAuth();

  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(ALL_WS);

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Panel
  const [panel, setPanel] = useState<PanelMode>({ type: "none" });

  // Load workspaces, auto-select the first one
  useEffect(() => {
    if (!accessToken) return;
    setIsLoadingWorkspaces(true);
    listWorkspaces(accessToken, { page: 1, pageSize: 100, search: "", ownerId: user?.sub })
      .then(({ items }) => {
        setWorkspaces(items);
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao carregar workspaces."))
      .finally(() => setIsLoadingWorkspaces(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user?.sub]);

  // Load contacts — single workspace or all workspaces in parallel
  const loadContacts = useCallback(
    (p: number, q: string, wsId: string) => {
      if (!accessToken) return;

      setIsLoading(true);

      if (wsId === ALL_WS) {
        // Fetch first page from every workspace in parallel and merge
        Promise.all(
          workspaces.map((ws) =>
            listWorkspaceContacts(accessToken, ws.id, { page: 1, pageSize: 50, search: q || undefined })
              .then(({ items }) => items)
              .catch(() => [] as Contact[])
          )
        )
          .then((results) => {
            const all = results.flat();
            setContacts(all);
            setTotal(all.length);
          })
          .finally(() => setIsLoading(false));
        return;
      }

      if (!wsId) {
        setContacts([]);
        setTotal(0);
        setIsLoading(false);
        return;
      }

      listWorkspaceContacts(accessToken, wsId, { page: p, pageSize: PAGE_SIZE, search: q || undefined })
        .then(({ items, total: t }) => {
          setContacts(items);
          setTotal(t);
        })
        .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao carregar contatos."))
        .finally(() => setIsLoading(false));
    },
    [accessToken, workspaces]
  );

  useEffect(() => {
    if (selectedWorkspaceId) loadContacts(page, search, selectedWorkspaceId);
  }, [loadContacts, page, search, selectedWorkspaceId]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const workspaceMap = useMemo(() => new Map(workspaces.map((ws) => [ws.id, ws])), [workspaces]);
  const selectedWorkspace = selectedWorkspaceId !== ALL_WS ? workspaceMap.get(selectedWorkspaceId) : undefined;

  // Determine workspace context for a given contact (needed in "all" view)
  function contactWorkspace(contact: Contact) {
    return workspaceMap.get(contact.workspaceId);
  }

  // CRUD handlers
  const handleCreate = useCallback(
    async (values: FormValues) => {
      if (!accessToken || !selectedWorkspaceId || selectedWorkspaceId === ALL_WS) return;
      const contact = await createWorkspaceContact(accessToken, selectedWorkspaceId, {
        phone: values.phone,
        ...(values.name ? { name: values.name } : {}),
        ...(values.alias ? { alias: values.alias } : {}),
        ...(values.email ? { email: values.email } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      });
      toast.success("Contato criado com sucesso.");
      setPanel({ type: "detail", contact });
      loadContacts(1, search, selectedWorkspaceId);
      setPage(1);
    },
    [accessToken, selectedWorkspaceId, loadContacts, search]
  );

  const handleUpdate = useCallback(
    async (contact: Contact, values: FormValues) => {
      if (!accessToken) return;
      const wsId = contact.workspaceId;
      const body: ContactUpdateBody = {};
      if (values.name) body.name = values.name;
      if (values.alias) body.alias = values.alias;
      if (values.email) body.email = values.email;
      if (values.notes) body.notes = values.notes;
      const updated = await updateWorkspaceContact(accessToken, wsId, contact._id, body);
      toast.success("Contato atualizado.");
      setContacts((prev) => prev.map((c) => (c._id === contact._id ? updated : c)));
      setPanel({ type: "detail", contact: updated });
    },
    [accessToken]
  );

  const handleDelete = useCallback(
    async (contact: Contact) => {
      if (!accessToken) return;
      try {
        await deleteWorkspaceContact(accessToken, contact.workspaceId, contact._id);
        toast.success("Contato excluído.");
        setContacts((prev) => prev.filter((c) => c._id !== contact._id));
        setPanel({ type: "none" });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao excluir contato.");
      }
    },
    [accessToken]
  );

  const handleImport = useCallback(
    async (contactId: string) => {
      if (!accessToken || !selectedWorkspaceId || selectedWorkspaceId === ALL_WS) return;
      const contact = await importWorkspaceContact(accessToken, selectedWorkspaceId, contactId);
      toast.success("Contato importado com sucesso.");
      setPanel({ type: "detail", contact });
      loadContacts(1, search, selectedWorkspaceId);
      setPage(1);
    },
    [accessToken, selectedWorkspaceId, loadContacts, search]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showPanel = panel.type !== "none";
  const selectedContactId = panel.type === "detail" || panel.type === "edit" ? panel.contact._id : null;
  const isAllView = selectedWorkspaceId === ALL_WS;
  const canCreate = selectedWorkspaceId && !isAllView;

  // Filtered contacts for client-side search in "all" view
  const displayedContacts = useMemo(() => {
    if (!isAllView || !search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        contactDisplayName(c).toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.alias ?? "").toLowerCase().includes(q)
    );
  }, [contacts, isAllView, search]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Contatos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={!canCreate} onClick={() => setPanel({ type: "import" })}>
            <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mr-1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            Importar
          </Button>
          <Button size="sm" disabled={!canCreate} onClick={() => setPanel({ type: "create" })}>
            <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mr-1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo contato
          </Button>
        </div>
      </div>

      {/* Workspace selector */}
      <WorkspaceSelector
        workspaces={workspaces}
        selectedId={selectedWorkspaceId}
        isLoading={isLoadingWorkspaces}
        onSelect={(id) => {
          setSelectedWorkspaceId(id);
          setPage(1);
          setPanel({ type: "none" });
        }}
      />

      {/* Search */}
      <div className="shrink-0 border-b border-border px-4 py-2">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, apelido, telefone ou e-mail…"
            disabled={!selectedWorkspaceId}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Grid panel */}
        <div className={cn("flex flex-col overflow-hidden", showPanel ? "hidden md:flex md:w-[55%] lg:w-[60%]" : "flex flex-1")}>
          <div className="scroll-pretty flex-1 overflow-y-auto p-4">
            {!selectedWorkspaceId ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40" aria-hidden>
                  <rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <p className="text-sm text-muted-foreground">Selecione um workspace para ver os contatos.</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : displayedContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p className="text-sm text-muted-foreground">
                  {search ? "Nenhum contato encontrado." : "Nenhum contato ainda."}
                </p>
                {!search && canCreate && (
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => setPanel({ type: "create" })}>
                    Criar primeiro contato
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {displayedContacts.map((contact) => {
                  const ws = contactWorkspace(contact);
                  return (
                    <ContactCard
                      key={contact._id}
                      contact={contact}
                      workspaceColor={ws?.customInterface.color ?? selectedWorkspace?.customInterface.color}
                      isSelected={selectedContactId === contact._id}
                      onSelect={() => setPanel({ type: "detail", contact })}
                      onEdit={() => setPanel({ type: "edit", contact })}
                      onDelete={() => void handleDelete(contact)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination — only for single-workspace view */}
          {!isAllView && totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2">
              <span className="text-xs text-muted-foreground">{total} contato{total !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-7 px-2 text-xs">←</Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 px-2 text-xs">→</Button>
              </div>
            </div>
          )}

          {/* Total indicator for "all" view */}
          {isAllView && displayedContacts.length > 0 && (
            <div className="flex shrink-0 items-center border-t border-border px-4 py-2">
              <span className="text-xs text-muted-foreground">{displayedContacts.length} contato{displayedContacts.length !== 1 ? "s" : ""} de todos os workspaces</span>
            </div>
          )}
        </div>

        {/* Side panel */}
        {showPanel && (
          <div className="scroll-pretty flex w-full flex-col overflow-y-auto border-l border-border md:w-[45%] lg:w-[40%]">
            <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {panel.type === "create" ? "Novo contato" : panel.type === "edit" ? "Editar contato" : panel.type === "import" ? "Importar contato" : "Detalhes"}
              </h2>
            </div>

            {panel.type === "create" && (
              <ContactForm mode="create" onSubmit={handleCreate} onCancel={() => setPanel({ type: "none" })} />
            )}
            {panel.type === "edit" && (
              <ContactForm
                mode="edit"
                initial={panel.contact}
                onSubmit={(values) => handleUpdate(panel.contact, values)}
                onCancel={() => setPanel({ type: "detail", contact: panel.contact })}
              />
            )}
            {panel.type === "import" && (
              <ImportForm onSubmit={handleImport} onCancel={() => setPanel({ type: "none" })} />
            )}
            {panel.type === "detail" && (
              <ContactDetail
                contact={panel.contact}
                workspaceName={contactWorkspace(panel.contact)?.name ?? selectedWorkspace?.name}
                workspaceColor={contactWorkspace(panel.contact)?.customInterface.color ?? selectedWorkspace?.customInterface.color}
                onEdit={() => setPanel({ type: "edit", contact: panel.contact })}
                onClose={() => setPanel({ type: "none" })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
