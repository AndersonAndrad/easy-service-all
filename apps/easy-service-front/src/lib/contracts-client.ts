import { authConfig } from "@easy-service/shared";
import type { MaternityContractData } from "@easy-service/shared";
import { parseErrorMessage } from "@/lib/auth-client";
import { publicApiClient } from "@/lib/http/public-api-client";

export type { MaternityContractData };

export type ContractType = {
  id: string;
  label: string;
  description: string;
  href: string;
  tag?: string;
};

export const CONTRACT_TYPES: ContractType[] = [
  {
    id: "maternity",
    label: "Contrato Salário Maternidade",
    description: "Contrato para serviços de salário maternidade com dados pessoais e endereço.",
    href: "/contracts/maternity",
    tag: "Thiago Ribeiro Evangelista",
  },
];

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
