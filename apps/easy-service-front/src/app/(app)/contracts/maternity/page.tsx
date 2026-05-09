import type { Metadata } from "next";
import { MaternityForm } from "@/components/contracts/maternity-form";

export const metadata: Metadata = {
  title: "Contrato de Maternidade",
  description: "Gere um contrato de maternidade em PDF.",
};

export default function Page() {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto">
      <MaternityForm />
    </div>
  );
}
