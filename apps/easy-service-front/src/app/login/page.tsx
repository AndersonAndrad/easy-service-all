import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/landing/site-header";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Área do atendente",
  description: "Acesso ao painel do atendente.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6"
      >
        <Card className="w-full max-w-md border-border/80 shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">Área do atendente</CardTitle>
            <CardDescription>
              Entre com seu e-mail ou usuário e senha para acessar o painel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Problemas para acessar?{" "}
              <Link
                href="/"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Voltar ao site
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
