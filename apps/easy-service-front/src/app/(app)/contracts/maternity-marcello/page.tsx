import type { Metadata } from "next";
import { MaternityMarcelloForm } from "@/components/contracts/maternity-marcello-form";

export const metadata: Metadata = {
  title: "Contrato Salário Maternidade — Marcello Renault",
  description: "Gere um contrato de salário maternidade Marcello Renault em PDF.",
};

export default function Page() {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto">
      <MaternityMarcelloForm />
    </div>
  );
}
