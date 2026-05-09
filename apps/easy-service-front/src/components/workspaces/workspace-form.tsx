"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        customInterface: {
          color: hex,
        },
        isActive,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="w-full max-w-3xl space-y-6"
      aria-readonly={readOnly || undefined}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor={`${baseId}-name`}>
          Nome
        </label>
        <Input
          id={`${baseId}-name`}
          name="name"
          required
          autoComplete="organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={locked || submitting}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor={`${baseId}-document`}>
          Documento
        </label>
        <Input
          id={`${baseId}-document`}
          name="document"
          autoComplete="off"
          inputMode="numeric"
          value={maskDocument(documentDigits)}
          onChange={(e) => setDocumentDigits(e.target.value.replace(/\D/g, "").slice(0, 14))}
          disabled={locked || submitting}
          placeholder="00.000.000/0000-00"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`${baseId}-active`}
          name="active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={locked || submitting}
          className={cn(
            "size-4 rounded border border-input bg-background text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        />
        <label htmlFor={`${baseId}-active`} className="text-sm font-medium text-foreground">
          Workspace ativa
        </label>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground" id={`${baseId}-color-label`}>
          Cor da interface (hex)
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id={`${baseId}-color`}
            type="color"
            aria-labelledby={`${baseId}-color-label`}
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            disabled={locked || submitting}
            className={cn(
              "h-10 w-14 cursor-pointer rounded border border-input bg-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <Input
            aria-label="Código hexadecimal da cor"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            disabled={locked || submitting}
            autoComplete="off"
            placeholder="#RRGGBB"
            className="max-w-[8.5rem] font-mono text-sm"
          />
        </div>
      </div>
      {hideSubmit ? null : (
        <Button type="submit" disabled={locked || submitting}>
          {submitting ? "Salvando…" : submitLabel}
        </Button>
      )}
    </form>
  );
}
