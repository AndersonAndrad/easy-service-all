import Link from "next/link";

import { IconMessageCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WHATSAPP_NUMBER = "5561993790035";
const WHATSAPP_MESSAGE =
  "Vim pelo seu sistema, poderia me falar melhor sobe o seu trabalho";

function buildWhatsAppHref(): string {
  const params = new URLSearchParams({ text: WHATSAPP_MESSAGE });
  return `https://wa.me/${WHATSAPP_NUMBER}?${params.toString()}`;
}

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          Easy Service
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-2 sm:gap-3"
          aria-label="Primary"
        >
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
            <a href="#contato">Entrar em contato</a>
          </Button>
          <Button variant="outline" size="sm" className="sm:hidden" asChild>
            <a href="#contato">Contato</a>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/login">Área do atendente</Link>
          </Button>
          <Button
            size="sm"
            className="bg-[#25D366] text-white hover:bg-[#20BD5A] focus-visible:ring-[#25D366]"
            asChild
          >
            <a
              href={buildWhatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Falar no WhatsApp"
            >
              <IconMessageCircle className="size-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
