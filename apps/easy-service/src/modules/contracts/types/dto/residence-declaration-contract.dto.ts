import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { ResidenceDeclarationData } from '@easy-service/shared';

export class ResidenceDeclarationContractDto implements ResidenceDeclarationData {
  @ApiProperty({ example: 'Maria Silva Santos' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'Solteiro(a)' })
  @IsString()
  @IsNotEmpty()
  maritalStatus: string;

  @ApiProperty({ example: 'Professora' })
  @IsString()
  @IsNotEmpty()
  profession: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '12345-678' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  rgState?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  streetNumber?: string;
}
