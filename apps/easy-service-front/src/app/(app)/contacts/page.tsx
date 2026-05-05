import type { Metadata } from "next";

import { ContactsPage } from "@/components/contacts/contacts-page";

export const metadata: Metadata = {
  title: "Contatos",
  description: "Gerenciar contatos dos workspaces.",
};

export default function Page() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:h-[100dvh]">
      <ContactsPage />
    </div>
  );
}
