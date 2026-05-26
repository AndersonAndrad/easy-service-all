"use client";

import { useId, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";
import type { WorkspaceWriteBody } from "@/lib/workspace-client";

const DEFAULT_HEX = "#3b82f6";
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function maskDocument(digits: string): string {
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

const inputCls =
  "h-10 w-full rounded-lg bg-muted/60 px-3 text-sm text-foreground placeholder:text-muted-foreground/40 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50 disabled:opacity-50";

const labelCls =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-primary/80">
        {children}
      </span>
      <span className="h-px flex-1 bg-border/40" />
    </div>
  );
}

export type WorkspaceFormProps = {
  initialValues?: WorkspaceWriteBody;
  submitLabel: string;
  onSubmit: (body: WorkspaceWriteBody) => Promise<void>;
  disabled?: boolean;
  readOnly?: boolean;
  hideSubmit?: boolean;
  onInvalidHex?: () => void;
};

export function WorkspaceForm({
  initialValues,
  submitLabel,
  onSubmit,
  disabled = false,
  readOnly = false,
  hideSubmit = false,
  onInvalidHex,
}: WorkspaceFormProps) {
  const baseId = useId();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [documentDigits, setDocumentDigits] = useState(
    (initialValues?.document ?? "").replace(/\D/g, "")
  );
  const initialHex = initialValues?.customInterface.color?.startsWith("#")
    ? initialValues.customInterface.color
    : DEFAULT_HEX;
  const [colorHex, setColorHex] = useState(
    HEX_PATTERN.test(initialHex) ? initialHex : DEFAULT_HEX
  );
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  const locked = disabled || readOnly;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || locked || hideSubmit) return;
    const hex = colorHex.trim();
    if (!HEX_PATTERN.test(hex)) {
      onInvalidHex?.();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        document: documentDigits,
        customInterface: { color: hex },
        isActive,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="w-full"
      aria-readonly={readOnly || undefined}
    >
      {/* Identification */}
      <div className="mb-8">
        <SectionTitle>Identificação</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <label htmlFor={`${baseId}-name`} className={labelCls}>Nome</label>
            <input
              id={`${baseId}-name`}
              name="name"
              required
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={locked || submitting}
              placeholder="Nome da empresa"
              className={inputCls}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor={`${baseId}-document`} className={labelCls}>Documento (CNPJ / CPF)</label>
            <input
              id={`${baseId}-document`}
              name="document"
              autoComplete="off"
              inputMode="numeric"
              value={maskDocument(documentDigits)}
              onChange={(e) => setDocumentDigits(e.target.value.replace(/\D/g, "").slice(0, 14))}
              disabled={locked || submitting}
              placeholder="00.000.000/0000-00"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="mb-8">
        <SectionTitle>Aparência e status</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Active toggle */}
          <label className={cn(
            "flex cursor-pointer select-none items-center gap-3 rounded-lg bg-muted/30 px-4 py-3",
            (locked || submitting) && "cursor-not-allowed opacity-50"
          )}>
            <div className="relative">
              <input
                id={`${baseId}-active`}
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={locked || submitting}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-sidebar-primary" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Empresa ativa</p>
              <p className="text-[10px] text-muted-foreground/60">Empresa visível no sistema</p>
            </div>
          </label>

          {/* Color picker */}
          <div className="flex flex-col">
            <span className={labelCls} id={`${baseId}-color-label`}>Cor da interface (hex)</span>
            <div className="flex items-center gap-3">
              <input
                id={`${baseId}-color`}
                type="color"
                aria-labelledby={`${baseId}-color-label`}
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                disabled={locked || submitting}
                className="h-10 w-14 cursor-pointer rounded-lg bg-muted/60 p-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <input
                aria-label="Código hexadecimal da cor"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                disabled={locked || submitting}
                autoComplete="off"
                placeholder="#RRGGBB"
                className={cn(inputCls, "max-w-[8rem] font-mono")}
              />
            </div>
          </div>
        </div>
      </div>

      {!hideSubmit && (
        <div className="border-t border-border/40 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={locked || submitting}
            className="inline-flex h-9 min-w-40 cursor-pointer items-center justify-center rounded-lg bg-sidebar-primary px-5 text-sm font-medium text-sidebar-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Salvando…" : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
