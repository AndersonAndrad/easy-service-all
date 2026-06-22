import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, Matches, ValidateBy, ValidateIf } from 'class-validator';
import { ACCIDENT_TYPES, normalizeTextLines, type AccidentAssistanceFormData, type AccidentType } from '@easy-service/shared';

const BRAZILIAN_PHONE_PATTERN = /^\(\d{2}\) \d{4,5}-\d{4}$/;

function hasAtMostWords(value: unknown, maximum: number): boolean {
  return typeof value === 'string' && value.trim().split(/\s+/u).filter(Boolean).length <= maximum;
}

function MaxWords(maximum: number): PropertyDecorator {
  return ValidateBy({
    name: 'maxWords',
    constraints: [maximum],
    validator: {
      validate: (value: unknown): boolean => hasAtMostWords(value, maximum),
      defaultMessage: (): string => `caseDescription must contain at most ${maximum} words`,
    },
  });
}

export class AccidentAssistanceFormDto implements AccidentAssistanceFormData {
  @ApiProperty({ example: 'Maria Silva Santos' })
  @IsString()
  @IsNotEmpty()
  fullName: string;
  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  cpf: string;
  @ApiProperty({ example: '69309-089' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
  @ApiProperty({ example: 'Rua José Pinheiro' })
  @IsString()
  @IsNotEmpty()
  street: string;
  @ApiProperty({ example: '731' })
  @IsString()
  @IsNotEmpty()
  streetNumber: string;
  @ApiPropertyOptional({ example: 'Apto 10' })
  @IsOptional()
  @IsString()
  complement?: string;
  @ApiProperty({ example: 'Liberdade' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;
  @ApiProperty({ example: 'Boa Vista' }) @IsString() @IsNotEmpty() city: string;
  @ApiProperty({ example: 'RR' }) @IsString() @IsNotEmpty() state: string;
  @ApiProperty({ example: '(95) 99999-9999' })
  @IsString()
  @IsNotEmpty()
  @Matches(BRAZILIAN_PHONE_PATTERN, { message: 'phone must use the format (99) 99999-9999' })
  phone: string;
  @ApiPropertyOptional({ example: '(95) 98888-8888' })
  @IsOptional()
  @IsString()
  @Matches(BRAZILIAN_PHONE_PATTERN, { message: 'secondaryPhone must use the format (99) 99999-9999' })
  secondaryPhone?: string;

  @ApiProperty({ enum: ACCIDENT_TYPES })
  @IsString()
  @IsIn(ACCIDENT_TYPES)
  accidentType: AccidentType;

  @ApiProperty({ example: true }) @IsBoolean() receivedSicknessBenefit: boolean;

  @ApiPropertyOptional({
    example: '2026-06-22',
    description: 'Required when sickness benefit was received',
  })
  @ValidateIf((dto: AccidentAssistanceFormDto): boolean => dto.receivedSicknessBenefit)
  @IsDateString({ strict: true })
  @IsString()
  @IsNotEmpty()
  sicknessBenefitEndDate?: string;

  @ApiProperty({ description: 'Case description with up to 450 words' })
  @Transform(({ value }): unknown => (typeof value === 'string' ? normalizeTextLines(value).trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxWords(450)
  caseDescription: string;
}
