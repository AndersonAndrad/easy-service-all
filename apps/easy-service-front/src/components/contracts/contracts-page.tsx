"use client";

import { useRouter } from "next/navigation";
import { CONTRACT_TYPES } from "@/lib/contracts-client";
import { NavIconFileText } from "@/components/icons/nav-menu";

export function ContractsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione o tipo de contrato que deseja gerar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CONTRACT_TYPES.map((contract) => (
          <button
            key={contract.id}
            onClick={() => router.push(contract.href)}
            className="flex items-start gap-4 rounded-lg border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
              <NavIconFileText className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-medium leading-tight">{contract.label}</span>
              <span className="text-sm text-muted-foreground leading-snug">
                {contract.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
