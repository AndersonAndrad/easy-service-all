import type { Metadata } from "next";
import { AccidentAssistanceForm } from "@/components/contracts/accident-assistance-form";

export const metadata: Metadata = {
  title: "Ficha atendimento auxílio acidente",
  description: "Gere a ficha de atendimento de auxílio-acidente em PDF.",
};

export default function Page() {
  return (
    <div className="flex min-h-full flex-col overflow-y-auto">
      <AccidentAssistanceForm />
    </div>
  );
}
