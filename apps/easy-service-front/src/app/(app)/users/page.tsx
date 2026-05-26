import type { Metadata } from "next";
import { UsersPage } from "@/components/users/users-page";

export const metadata: Metadata = {
  title: "Cadastro de Usuário",
  description: "Gerencie os usuários do sistema.",
};

export default function Page() {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto">
      <UsersPage />
    </div>
  );
}
