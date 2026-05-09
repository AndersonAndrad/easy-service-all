import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perfil",
  description: "Perfil do usuário.",
};

export default function ProfileSettingsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Perfil
        </h1>
        <p className="mt-2 text-muted-foreground">Conteúdo em construção.</p>
      </div>
    </div>
  );
}
