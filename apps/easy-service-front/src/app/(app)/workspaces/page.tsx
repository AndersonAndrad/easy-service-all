import type { Metadata } from "next";

import { WorkspacesList } from "@/components/workspaces/workspaces-list";

export const metadata: Metadata = {
  title: "Workspaces",
  description: "Lista e gerenciamento de workspaces.",
};

export default function WorkspacesPage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col p-4 md:h-[100dvh] md:p-6">
      <WorkspacesList />
    </div>
  );
}
