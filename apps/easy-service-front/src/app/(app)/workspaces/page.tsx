import type { Metadata } from "next";

import { WorkspacesList } from "@/components/workspaces/workspaces-list";

export const metadata: Metadata = {
  title: "Empresas",
  description: "Lista e gerenciamento de empresas.",
};

export default function WorkspacesPage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-[100dvh]">
      <WorkspacesList />
    </div>
  );
}
