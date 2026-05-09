"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import { toast } from "@/components/toast/toaster";
import { useAuth } from "@/contexts/auth-context";
import { createWorkspace, type WorkspaceWriteBody } from "@/lib/workspace-client";

export default function NewWorkspacePage() {
  const router = useRouter();
  const { accessToken, isReady } = useAuth();

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-auto p-4 md:min-h-[100dvh] md:p-6">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1 text-center sm:text-start">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
              Novo workspace
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              Cadastre um novo workspace. Após salvar, você será enviado para a lista. Para conectar o
              WhatsApp, use a opção de conexão na listagem.
            </p>
          </div>
          <Button variant="outline" asChild className="w-full shrink-0 sm:w-auto">
            <Link href="/workspaces">Voltar à lista</Link>
          </Button>
        </div>

        <div className="flex w-full flex-col items-center">
          <WorkspaceForm
            submitLabel="Salvar"
            disabled={!isReady || !accessToken}
            onInvalidHex={() => {
              toast.error("Use uma cor hexadecimal válida no formato #RRGGBB.");
            }}
            onSubmit={async (body: WorkspaceWriteBody) => {
              if (!accessToken) {
                toast.error("Sessão inválida. Entre novamente.");
                return;
              }
              const tid = toast.loading("Criando workspace…");
              try {
                await createWorkspace(accessToken, body);
                toast.success("Workspace criado com sucesso.", { id: tid });
                router.push("/workspaces");
                router.refresh();
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Não foi possível criar.";
                toast.error(msg, { id: tid });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
