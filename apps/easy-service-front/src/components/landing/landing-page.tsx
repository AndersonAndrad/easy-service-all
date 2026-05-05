import Image from "next/image";
import Link from "next/link";

import {
  IconArrowRight,
  IconLock,
  IconMessageCircle,
  IconShieldCheck,
  IconSparkles,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/landing/site-header";

const WHATSAPP_NUMBER = "5561993790035";
const WHATSAPP_MESSAGE =
  "Vim pelo seu sistema, poderia me falar melhor sobe o seu trabalho";

function buildWhatsAppHref(): string {
  const params = new URLSearchParams({ text: WHATSAPP_MESSAGE });
  return `https://wa.me/${WHATSAPP_NUMBER}?${params.toString()}`;
}

const services = [
  {
    title: "Qualificação de leads (CRC)",
    description:
      "Triagem profissional para identificar oportunidades reais, padronizar o primeiro contato e preparar o funil com clareza e consistência.",
    image: "/undraw/crc.svg",
  },
  {
    title: "Fechamento de contrato (Closer)",
    description:
      "Condução consultiva do fechamento, alinhamento de expectativas e acompanhamento até a assinatura, com foco em resultado e experiência do cliente.",
    image: "/undraw/closer.svg",
  },
  {
    title: "Trabalhista e previdenciário",
    description:
      "Atendimento especializado em demandas trabalhistas e previdenciárias, com linguagem clara e processos organizados para você e para quem você atende.",
    image: "/undraw/legal.svg",
  },
] as const;

const trustPoints = [
  {
    icon: IconShieldCheck,
    title: "Confiança em primeiro lugar",
    text: "Processos definidos, comunicação transparente e acompanhamento em cada etapa do atendimento.",
  },
  {
    icon: IconLock,
    title: "Plataforma segura",
    text: "Ambiente pensado para proteger dados e conversas, com boas práticas de acesso e governança da informação.",
  },
  {
    icon: IconSparkles,
    title: "Experiência profissional",
    text: "Um sistema estável e previsível para sua operação — menos improviso, mais consistência no dia a dia.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-0 pointer-events-none transition focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Ir para o conteúdo principal
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section
          className="relative overflow-hidden border-b border-border/60 bg-linear-to-b from-muted/50 to-background"
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-24">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <IconShieldCheck className="size-3.5 text-primary" aria-hidden />
                Operação com credibilidade e segurança
              </p>
              <h1
                id="hero-heading"
                className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
              >
                Atendimento que transmite confiança do primeiro ao último contato
              </h1>
              <p className="text-pretty text-lg text-muted-foreground sm:text-xl">
                Unimos processos claros, comunicação humana e uma plataforma segura para
                qualificar leads, fechar contratos e apoiar demandas trabalhistas e
                previdenciárias com consistência.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground sm:text-base">
                <li className="flex gap-2">
                  <span className="mt-1 text-primary" aria-hidden>
                    •
                  </span>
                  <span>
                    Transparência no fluxo: você sabe o que acontece em cada etapa.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 text-primary" aria-hidden>
                    •
                  </span>
                  <span>
                    Segurança como prioridade: dados e interações tratados com seriedade.
                  </span>
                </li>
              </ul>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <a href="#contato">
                    Falar com a gente
                    <IconArrowRight className="size-4" aria-hidden />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/login">Área do atendente</Link>
                </Button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                <Image
                  src="/undraw/crc.svg"
                  alt=""
                  width={800}
                  height={600}
                  className="h-full w-full object-cover"
                  priority
                  unoptimized
                />
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Ilustrações no estilo{" "}
                <a
                  href="https://undraw.co/"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  unDraw
                </a>
                — personalize cores e baixe SVGs no site oficial.
              </p>
            </div>
          </div>
        </section>

        <section
          className="border-b border-border/60 bg-background py-16 sm:py-20"
          aria-labelledby="services-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="services-heading"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                O que fazemos por você
              </h2>
              <p className="mt-3 text-muted-foreground sm:text-lg">
                Três frentes de atuação para organizar conversas, acelerar fechamentos e
                dar suporte jurídico com clareza.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services.map((item) => (
                <Card key={item.title} className="overflow-hidden border-border/80">
                  <div className="aspect-[16/10] w-full border-b border-border/60 bg-muted/40">
                    <Image
                      src={item.image}
                      alt=""
                      width={800}
                      height={500}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
                    <CardDescription className="text-base">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <Button variant="link" className="h-auto p-0" asChild>
                      <a href="#contato">
                        Quero saber mais
                        <IconArrowRight className="size-4" aria-hidden />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section
          className="bg-muted/40 py-16 sm:py-20"
          aria-labelledby="trust-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="trust-heading"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                Segurança e confiança em cada detalhe
              </h2>
              <p className="mt-3 text-muted-foreground sm:text-lg">
                Você precisa de um parceiro previsível. Nosso compromisso é combinar
                processos sólidos com uma experiência digital estável e responsável.
              </p>
            </div>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {trustPoints.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <Card className="h-full border-border/80">
                    <CardHeader className="space-y-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <CardTitle className="text-base">{title}</CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {text}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="contato"
          className="border-t border-border/60 bg-background py-16 sm:py-20"
          aria-labelledby="contact-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4">
                <h2
                  id="contact-heading"
                  className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                >
                  Entrar em contato
                </h2>
                <p className="text-muted-foreground sm:text-lg">
                  Conte o que você precisa. Respondemos com clareza e responsabilidade —
                  seja por WhatsApp ou seguindo o fluxo dentro da plataforma.
                </p>
                <p className="text-sm text-muted-foreground">
                  Horários e canais podem variar; sua mensagem no WhatsApp já chega com o
                  contexto certo para agilizar o retorno.
                </p>
              </div>
              <Card className="border-border/80 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Fale conosco agora</CardTitle>
                  <CardDescription>
                    Use o WhatsApp com uma mensagem pronta ou volte ao topo para acessar a
                    área do atendente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row">
                  <Button className="w-full bg-[#25D366] text-white hover:bg-[#20BD5A] sm:flex-1" asChild>
                    <a
                      href={buildWhatsAppHref()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <IconMessageCircle className="size-4" aria-hidden />
                      WhatsApp
                    </a>
                  </Button>
                  <Button className="w-full sm:flex-1" variant="secondary" asChild>
                    <Link href="/login">Área do atendente</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border/60 bg-muted/30 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Easy Service. Todos os direitos reservados.</p>
          <a
            href="#main"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Voltar ao topo
          </a>
        </div>
      </footer>
    </div>
  );
}
