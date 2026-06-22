import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccidentAssistanceFormDto } from '../types/dto/accident-assistance-form.dto';

const VALID_DATA = {
  fullName: 'Maria Silva',
  cpf: '111.222.333-44',
  postalCode: '69309-089',
  street: 'Rua A',
  streetNumber: '10',
  neighborhood: 'Centro',
  city: 'Boa Vista',
  state: 'RR',
  phone: '(95) 99999-9999',
  accidentType: 'Qualquer natureza (31)',
  receivedSicknessBenefit: false,
  caseDescription: 'Caso em análise.',
};

describe('AccidentAssistanceFormDto', (): void => {
  it('accepts a valid payload', async (): Promise<void> => {
    expect(await validate(plainToInstance(AccidentAssistanceFormDto, VALID_DATA))).toHaveLength(0);
  });

  it('rejects a description longer than 450 words', async (): Promise<void> => {
    const dto = plainToInstance(AccidentAssistanceFormDto, {
      ...VALID_DATA,
      caseDescription: Array.from({ length: 451 }, (): string => 'palavra').join(' '),
    });

    const errors = await validate(dto);
    expect(errors.some((error): boolean => error.property === 'caseDescription')).toBe(true);
  });

  it('requires a valid cessation date when sickness benefit was received', async (): Promise<void> => {
    const dto = plainToInstance(AccidentAssistanceFormDto, {
      ...VALID_DATA,
      receivedSicknessBenefit: true,
    });

    const errors = await validate(dto);
    expect(errors.some((error): boolean => error.property === 'sicknessBenefitEndDate')).toBe(true);
  });

  it('rejects accident types outside the supported list', async (): Promise<void> => {
    const dto = plainToInstance(AccidentAssistanceFormDto, {
      ...VALID_DATA,
      accidentType: 'Outro',
    });

    const errors = await validate(dto);
    expect(errors.some((error): boolean => error.property === 'accidentType')).toBe(true);
  });

  it('rejects a phone number without the Brazilian mask', async (): Promise<void> => {
    const dto = plainToInstance(AccidentAssistanceFormDto, { ...VALID_DATA, phone: '95999999999' });

    const errors = await validate(dto);
    expect(errors.some((error): boolean => error.property === 'phone')).toBe(true);
  });

  it('normalizes description spacing while preserving manual line breaks', (): void => {
    const dto = plainToInstance(AccidentAssistanceFormDto, {
      ...VALID_DATA,
      caseDescription: 'Primeira   linha\n  Segunda     linha',
    });

    expect(dto.caseDescription).toBe('Primeira linha\nSegunda linha');
  });
});
