import type { Metadata } from "next";
import { MaternityForm } from "@/components/contracts/maternity-form";
export const metadata: Metadata = {
  title: "Contrato Salário Maternidade — WE CORE",
  description: "Gere um contrato de salário maternidade WE CORE em PDF.",
};

export default function Page() {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto">
      <MaternityForm
        title="Contrato Salário Maternidade — WE CORE"
        breadcrumbLabel="Salário Maternidade WE CORE"
        contractVariant="maternity-we-core"
      />
    </div>
  );
}
