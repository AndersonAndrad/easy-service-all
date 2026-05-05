import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/landing/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Redefinição de senha.",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main
        id="main"
        className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6"
      >
        <div className="max-w-md space-y-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            Recuperar senha
          </h1>
          <p className="text-pretty text-muted-foreground">
            Em breve você poderá redefinir sua senha por e-mail ou SMS.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/login">Voltar ao login</Link>
        </Button>
      </main>
    </div>
  );
}
