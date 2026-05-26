export interface MaternityContractData {
  fullName: string;
  cpf: string;
  rg?: string;
  maritalStatus: string;
  profession: string;
  street: string;
  neighborhood: string;
  postalCode: string;
  city: string;
  state: string;
  isMinor?: boolean;
  guardianName?: string;
  guardianRg?: string;
  guardianCpf?: string;
}

export type ContractType = "maternity";
