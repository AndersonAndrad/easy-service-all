import { authConfig } from "@easy-service/shared";
import type { AccidentAssistanceFormData, ClevesContractData, MaternityContractData, MaternityMarcelloContractData, ResidenceDeclarationData } from "@easy-service/shared";
import { parseErrorMessage } from "@/lib/auth-client";
import { publicApiClient } from "@/lib/http/public-api-client";

export type { AccidentAssistanceFormData, ClevesContractData, MaternityContractData, MaternityMarcelloContractData, ResidenceDeclarationData };

export type ContractType = {
  id: string;
  label: string;
  description: string;
  href: string;
  tag?: string;
};

export const CONTRACT_TYPES: ContractType[] = [
  {
    id: "accident-assistance-form",
    label: "Ficha atendimento auxílio acidente",
    description: "Ficha de atendimento para análise de auxílio-acidente.",
    href: "/contracts/accident-assistance-form",
  },
  {
    id: "maternity",
    label: "Contrato Salário Maternidade",
    description: "Contrato para serviços de salário maternidade com dados pessoais e endereço.",
    href: "/contracts/maternity",
    tag: "Thiago Ribeiro Evangelista",
  },
  {
    id: "maternity-we-core",
    label: "Contrato Salário Maternidade",
    description: "Contrato para serviços de salário maternidade — Agência WE CORE Assessoria Digital.",
    href: "/contracts/maternity-we-core",
    tag: "Agência WE CORE Assessoria Digital",
  },
  {
    id: "maternity-marcello",
    label: "Contrato Salário Maternidade",
    description: "Contrato para serviços de salário maternidade — Marcello Renault Sociedade Individual de Advocacia.",
    href: "/contracts/maternity-marcello",
    tag: "Marcello Renault",
  },
  {
    id: "residence-declaration",
    label: "Declaração de Residência",
    description: "Declaração de residência para fins de comprovação de endereço.",
    href: "/contracts/residence-declaration",
  },
  {
    id: "cleves",
    label: "Contrato Auxílio Acidente",
    description: "Contrato de serviços jurídicos — Cleves Domingos Galliasi.",
    href: "/contracts/cleves",
    tag: "Cleves Domingos Galliasi",
  },
];

export async function generateAccidentAssistanceForm(
  accessToken: string,
  body: AccidentAssistanceFormData
): Promise<Blob> {
  try {
    const res = await publicApiClient.post<ArrayBuffer>(
      "/contracts/accident-assistance-form",
      body,
      { ...authConfig(accessToken), responseType: "arraybuffer" }
    );
    return new Blob([res.data], { type: "application/pdf" });
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function generateMaternityContract(
  accessToken: string,
  body: MaternityContractData
): Promise<Blob> {
  try {
    const res = await publicApiClient.post<ArrayBuffer>(
      `/contracts/maternity`,
      body,
      { ...authConfig(accessToken), responseType: "arraybuffer" }
    );
    return new Blob([res.data], { type: "application/pdf" });
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function generateWeCoreMaternityContract(
  accessToken: string,
  body: MaternityContractData
): Promise<Blob> {
  try {
    const res = await publicApiClient.post<ArrayBuffer>(
      `/contracts/maternity-we-core`,
      body,
      { ...authConfig(accessToken), responseType: "arraybuffer" }
    );
    return new Blob([res.data], { type: "application/pdf" });
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function generateMarcelloMaternityContract(
  accessToken: string,
  body: MaternityMarcelloContractData
): Promise<Blob> {
  try {
    const res = await publicApiClient.post<ArrayBuffer>(
      `/contracts/maternity-marcello`,
      body,
      { ...authConfig(accessToken), responseType: "arraybuffer" }
    );
    return new Blob([res.data], { type: "application/pdf" });
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function generateResidenceDeclarationContract(
  accessToken: string,
  body: ResidenceDeclarationData
): Promise<Blob> {
  try {
    const res = await publicApiClient.post<ArrayBuffer>(
      `/contracts/residence-declaration`,
      body,
      { ...authConfig(accessToken), responseType: "arraybuffer" }
    );
    return new Blob([res.data], { type: "application/pdf" });
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function generateClevesContract(
  accessToken: string,
  body: ClevesContractData
): Promise<Blob> {
  try {
    const res = await publicApiClient.post<ArrayBuffer>(
      "/contracts/cleves",
      body,
      { ...authConfig(accessToken), responseType: "arraybuffer" }
    );
    return new Blob([res.data], { type: "application/pdf" });
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
