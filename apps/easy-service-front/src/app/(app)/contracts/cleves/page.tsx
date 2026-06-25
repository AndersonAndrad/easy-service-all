import type { Metadata } from "next";
import { ClevesForm } from "@/components/contracts/cleves-form";

export const metadata: Metadata = {
  title: "Contrato Auxílio Acidente — Cleves Domingos Galliasi",
  description: "Gere o contrato de serviços jurídicos de auxílio acidente em PDF.",
};

export default function Page() {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto">
      <ClevesForm />
    </div>
  );
}
