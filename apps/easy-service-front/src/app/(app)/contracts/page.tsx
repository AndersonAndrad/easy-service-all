import type { Metadata } from "next";
import { ContractsPage } from "@/components/contracts/contracts-page";

export const metadata: Metadata = {
  title: "Contracts",
  description: "Generate contracts as PDF.",
};

export default function Page() {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto">
      <ContractsPage />
    </div>
  );
}
