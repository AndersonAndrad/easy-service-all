"use client";

import { useRouter } from "next/navigation";
import { CONTRACT_TYPES } from "@/lib/contracts-client";
import { NavIconFileText } from "@/components/icons/nav-menu";

export function ContractsPage() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-5">
        <h1 className="text-xl font-semibold text-foreground">Contratos</h1>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          Selecione o tipo de contrato que deseja gerar.
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONTRACT_TYPES.map((contract) => (
            <button
              key={contract.id}
              type="button"
              onClick={() => router.push(contract.href)}
              className="group flex cursor-pointer items-start gap-4 rounded-xl bg-card/60 p-5 text-left transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50"
            >
              <div className="mt-0.5 shrink-0 rounded-lg bg-sidebar-primary/10 p-2.5 text-sidebar-primary transition-colors group-hover:bg-sidebar-primary/20">
                <NavIconFileText className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium leading-tight text-foreground">{contract.label}</span>
                <span className="text-xs leading-snug text-muted-foreground/70">
                  {contract.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
