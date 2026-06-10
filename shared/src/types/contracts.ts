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

export interface ResidenceDeclarationData {
  fullName: string;
  maritalStatus: string;
  profession: string;
  cpf: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  rg?: string;
  rgState?: string;
  streetNumber?: string;
}

export type ContractType = "maternity" | "maternity-we-core" | "maternity-marcello" | "residence-declaration";
