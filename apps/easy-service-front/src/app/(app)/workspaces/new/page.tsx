"use client";

import { useRouter } from "next/navigation";

import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import { toast } from "@/components/toast/toaster";
import { useAuth } from "@/contexts/auth-context";
import { createWorkspace, type WorkspaceWriteBody } from "@/lib/workspace-client";

export default function NewWorkspacePage() {
  const router = useRouter();
  const { accessToken, isReady } = useAuth();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-[100dvh]">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground/60">
          <button
            type="button"
            onClick={() => router.push("/workspaces")}
            className="cursor-pointer transition-colors hover:text-muted-foreground"
          >
            Empresas
          </button>
          <span>/</span>
          <span className="text-foreground/80">Nova empresa</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Nova empresa</h1>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          Após salvar, você poderá conectar o WhatsApp na listagem.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <WorkspaceForm
            submitLabel="Salvar empresa"
            disabled={!isReady || !accessToken}
            onInvalidHex={() => {
              toast.error("Use uma cor hexadecimal válida no formato #RRGGBB.");
            }}
            onSubmit={async (body: WorkspaceWriteBody) => {
              if (!accessToken) {
                toast.error("Sessão inválida. Entre novamente.");
                return;
              }
              const tid = toast.loading("Criando empresa…");
              try {
                await createWorkspace(accessToken, body);
                toast.success("Empresa criada com sucesso.", { id: tid });
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
