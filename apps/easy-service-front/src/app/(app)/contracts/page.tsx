import type { Metadata } from "next";
import { ContractsPage } from "@/components/contracts/contracts-page";

export const metadata: Metadata = {
  title: "Contratos",
  description: "Gere contratos em PDF.",
};

export default function Page() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-[100dvh]">
      <ContractsPage />
    </div>
  );
}
