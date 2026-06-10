import type { Metadata } from "next";
import { ResidenceDeclarationForm } from "@/components/contracts/residence-declaration-form";

export const metadata: Metadata = {
  title: "Declaração de Residência",
  description: "Gere uma declaração de residência em PDF.",
};

export default function Page() {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto">
      <ResidenceDeclarationForm />
    </div>
  );
}
