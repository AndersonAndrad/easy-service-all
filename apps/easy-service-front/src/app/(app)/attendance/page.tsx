import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fila de espera",
  description: "Área de espera do atendimento.",
};

export default function AttendancePage() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
        <div
          className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Carregando"
        />
        <div className="max-w-md space-y-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            Aguardando atendimento
          </h1>
          <p className="text-pretty text-muted-foreground">
            Você está na fila. Em instantes um atendente dará continuidade ao seu
            atendimento.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
