"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconEye, IconEyeOff } from "@/components/icons";
import { toast } from "@/components/toast/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import {
  loginRequest,
  parseErrorMessage,
} from "@/lib/auth-client";
import {
  clearLoginPenalty,
  getRemainingLockoutMs,
  isLoginLockedOut,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [identification, setIdentification] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, setClock] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setClock((c) => c + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const locked = mounted && isLoginLockedOut();
  const secondsLeft = Math.ceil(getRemainingLockoutMs() / 1000);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked) {
      toast.error(
        `Aguarde ${secondsLeft} segundo${secondsLeft !== 1 ? "s" : ""} antes de tentar novamente.`
      );
      return;
    }

    const trimmed = identification.trim();
    if (!trimmed || !password) {
      toast.error("Preencha e-mail ou usuário e a senha.");
      return;
    }

    const toastId = toast.loading("Autenticando...");

    try {
      const tokens = await loginRequest({
        identification: trimmed,
        password,
      });

      clearLoginPenalty();
      signIn(tokens);
      toast.success("Login realizado! Redirecionando...", { id: toastId });
      await new Promise((r) => setTimeout(r, 450));
      router.push("/attendance");
    } catch (error) {
      recordLoginFailure();
      let msg = await parseErrorMessage(error);
      if (isLoginLockedOut()) {
        const s = Math.ceil(getRemainingLockoutMs() / 1000);
        msg = `${msg} Aguarde ${s}s antes de nova tentativa.`;
      }
      toast.error(msg, { id: toastId });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="identification">E-mail ou usuário</Label>
        <Input
          id="identification"
          name="identification"
          type="text"
          autoComplete="username"
          placeholder="nome@empresa.com ou seu usuário"
          value={identification}
          onChange={(e) => setIdentification(e.target.value)}
          disabled={locked}
          aria-invalid={locked}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/reset-password"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={locked}
            className="pr-11"
            aria-invalid={locked}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={showPassword}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <IconEyeOff className="size-4" />
            ) : (
              <IconEye className="size-4" />
            )}
          </button>
        </div>
      </div>

      {locked && secondsLeft > 0 ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
          role="status"
          aria-live="polite"
        >
          Muitas tentativas incorretas. Tente novamente em{" "}
          <span className="font-semibold tabular-nums">{secondsLeft}</span>s.
        </p>
      ) : null}

      <Button type="submit" className="w-full" size="lg" disabled={locked}>
        Entrar
      </Button>

      <Button variant="outline" className="w-full" asChild>
        <Link href="/">Voltar à página inicial</Link>
      </Button>
    </form>
  );
}
