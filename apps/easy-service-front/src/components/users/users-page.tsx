"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/toast/toaster";
import { Button } from "@/components/ui/button";
import { CopyClipboard } from "@/components/ui/copy-clipboard";
import { useAuth } from "@/contexts/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type CreateUserBody,
  type UserResponse,
} from "@/lib/user-client";

const ROLES_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

const EMPTY_FORM: CreateUserBody = {
  name: "",
  email: "",
  cnpj: "",
  userName: "",
  password: "",
  roles: [],
};

type ModalMode = "create" | "edit" | "details";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
};

export function UsersPage() {
  const { accessToken } = useAuth();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState<{ mode: ModalMode; user?: UserResponse } | null>(null);
  const [form, setForm] = useState<CreateUserBody>(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setUsers(await listUsers(accessToken));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function openCreate() { setForm(EMPTY_FORM); setModal({ mode: "create" }); }
  function openEdit(u: UserResponse) {
    setForm({ name: u.name, email: u.email, cnpj: u.cnpj, userName: u.userName, password: "", roles: u.roles });
    setModal({ mode: "edit", user: u });
    setOpenMenu(null);
  }
  function openDetails(u: UserResponse) { setModal({ mode: "details", user: u }); setOpenMenu(null); }
  function closeModal() { setModal(null); }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }
  function handleCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, cnpj: maskCnpj(e.target.value) }));
  }
  function toggleRole(role: string) {
    setForm((p) => ({
      ...p,
      roles: p.roles.includes(role) ? p.roles.filter((r) => r !== role) : [...p.roles, role],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      if (modal?.mode === "create") {
        await createUser(accessToken, form);
        toast.success("Usuário criado com sucesso.");
      } else if (modal?.mode === "edit" && modal.user) {
        const { password, ...rest } = form;
        await updateUser(accessToken, modal.user._id, password ? form : rest);
        toast.success("Usuário atualizado com sucesso.");
      }
      closeModal();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(accessToken, deleteTarget._id);
      toast.success("Usuário excluído.");
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir usuário.");
    } finally {
      setDeleting(false);
    }
  }

  const isEdit = modal?.mode === "edit";
  const isDetails = modal?.mode === "details";

  return (
    <div className="flex h-full flex-col">

      {/* ── Page header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-6 py-5">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Usuários</h1>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando…" : `${users.length} ${users.length === 1 ? "usuário" : "usuários"} cadastrado${users.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>+ Cadastrar usuário</Button>
      </div>

      {/* ── Table area ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 border-b border-border/60 bg-card/80 backdrop-blur-sm">
            <tr>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Usuário</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">E-mail</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perfis</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cadastro</th>
              <th className="w-10 px-5 py-3.5" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 animate-pulse rounded-full bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><div className="h-3 w-40 animate-pulse rounded bg-muted" /></td>
                  <td className="px-5 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></td>
                  <td className="px-5 py-4"><div className="h-3 w-20 animate-pulse rounded bg-muted" /></td>
                  <td className="px-5 py-4" />
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Nenhum usuário cadastrado</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Cadastre o primeiro usuário do sistema.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={openCreate}>Cadastrar usuário</Button>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user._id}
                  className="group border-b border-border/40 last:border-0 transition-colors hover:bg-muted/20"
                >
                  {/* Name + username */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-[11px] font-semibold text-sidebar-primary">
                        {initials(user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{user.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">@{user.userName}</p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    <CopyClipboard value={user.email} />
                  </td>

                  {/* Roles */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 rounded-full bg-sidebar-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sidebar-primary"
                        >
                          {ROLE_LABEL[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-4 text-sm tabular-nums text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="relative flex justify-end" ref={openMenu === user._id ? menuRef : null}>
                      <button
                        onClick={() => setOpenMenu(openMenu === user._id ? null : user._id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        aria-label="Ações"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>

                      {openMenu === user._id && (
                        <div className="absolute right-0 top-8 z-20 min-w-44 rounded-lg border border-border/60 bg-card py-1 shadow-xl">
                          <button onClick={() => openDetails(user)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                            Ver detalhes
                          </button>
                          <button onClick={() => openEdit(user)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-foreground transition-colors hover:bg-muted">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.415 9.415a1 1 0 0 1-.394.243l-3 1a1 1 0 0 1-1.265-1.265l1-3a1 1 0 0 1 .243-.394z" /></svg>
                            Editar
                          </button>
                          <div className="my-1 mx-1 border-t border-border/60" />
                          <button onClick={() => { setDeleteTarget(user); setOpenMenu(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-lg flex-col rounded-xl border border-border/60 bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
              <h2 className="font-semibold text-foreground">
                {modal.mode === "create" && "Cadastrar usuário"}
                {modal.mode === "edit" && "Editar usuário"}
                {modal.mode === "details" && "Detalhes do usuário"}
              </h2>
              <button onClick={closeModal} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {isDetails && modal.user ? (
              <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sm font-semibold text-sidebar-primary">
                    {initials(modal.user.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{modal.user.name}</p>
                    <p className="text-xs text-muted-foreground">@{modal.user.userName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="E-mail" value={modal.user.email} copyable />
                  <DetailRow label="CNPJ" value={modal.user.cnpj} />
                  <DetailRow label="Perfis" value={modal.user.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ")} />
                  <DetailRow label="Cadastro" value={formatDate(modal.user.createdAt)} />
                </div>
                <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                  <Button size="sm" variant="outline" onClick={closeModal}>Fechar</Button>
                  <Button size="sm" onClick={() => { openEdit(modal.user!); }}>Editar</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Nome completo" name="name" value={form.name} onChange={handleChange} required className="col-span-2" />
                  <FormField label="Usuário" name="userName" value={form.userName} onChange={handleChange} required />
                  <FormField label="E-mail" name="email" type="email" value={form.email} onChange={handleChange} required />
                  <FormField label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleCnpjChange} placeholder="00.000.000/0000-00" inputMode="numeric" required />
                  <PasswordField
                    label={isEdit ? "Nova senha (opcional)" : "Senha"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!isEdit}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">Perfis</span>
                  <div className="flex gap-4">
                    {ROLES_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={form.roles.includes(opt.value)} onChange={() => toggleRole(opt.value)} className="h-4 w-4 rounded border accent-sidebar-primary" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                  <Button type="button" size="sm" variant="outline" onClick={closeModal}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {copyable ? <CopyClipboard value={value || "—"} /> : <span className="text-sm text-foreground">{value || "—"}</span>}
    </div>
  );
}

function FormField({ label, name, value, onChange, type = "text", placeholder, required, inputMode, className }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={name} className="text-xs font-medium text-muted-foreground">{label}</label>
      <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder}
        required={required} inputMode={inputMode}
        className="h-9 w-full rounded-lg border border-border/60 bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

function PasswordField({ label, name, value, onChange, required }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <input id={name} name={name} type={visible ? "text" : "password"} value={value} onChange={onChange}
          required={required}
          className="h-9 w-full rounded-lg border border-border/60 bg-input px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button type="button" onClick={() => setVisible((v) => !v)}
          className="absolute right-0 top-0 flex h-9 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
          {visible
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
          }
        </button>
      </div>
    </div>
  );
}
