import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perfil",
  description: "Perfil do usuário.",
};

export default function ProfileSettingsPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Perfil
      </h1>
      <p className="mt-2 text-muted-foreground">Conteúdo em construção.</p>
    </div>
  );
}
