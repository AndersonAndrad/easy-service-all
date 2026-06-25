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
export declare const ACCIDENT_TYPES: readonly ["Qualquer natureza (31)", "Acidente de Trabalho (91)", "Doença do Trabalho (91)"];
export type AccidentType = (typeof ACCIDENT_TYPES)[number];
export interface AccidentAssistanceFormData {
    fullName: string;
    cpf: string;
    postalCode: string;
    street: string;
    streetNumber: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    phone: string;
    secondaryPhone?: string;
    accidentType: AccidentType;
    receivedSicknessBenefit: boolean;
    sicknessBenefitEndDate?: string;
    caseDescription: string;
}
export interface ClevesContractData {
    fullName: string;
    nationality: string;
    maritalStatus: string;
    profession: string;
    cpf: string;
    street: string;
    streetNumber: string;
    neighborhood: string;
    postalCode: string;
    city: string;
    state: string;
}
export type ContractType = "maternity" | "maternity-we-core" | "maternity-marcello" | "residence-declaration" | "accident-assistance-form" | "cleves";
//# sourceMappingURL=contracts.d.ts.map