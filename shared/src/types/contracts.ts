export interface MaternityContractData {
  fullName: string;
  cpf: string;
  maritalStatus: string;
  profession: string;
  street: string;
  neighborhood: string;
  postalCode: string;
  city: string;
  state: string;
  isMinor?: boolean;
  guardianName?: string;
  guardianCpf?: string;
}

export interface MaternityMarcelloContractData extends MaternityContractData {
  rg?: string;
  rgState?: string;
  streetNumber?: string;
  email?: string;
  phone?: string;
}

export type ContractType = "maternity" | "maternity-we-core" | "maternity-marcello";
