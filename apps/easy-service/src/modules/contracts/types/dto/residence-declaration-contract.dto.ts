import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
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

  @ApiProperty({ example: '1234567' })
  @IsString()
  @IsNotEmpty()
  rg: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @IsNotEmpty()
  rgState: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  streetNumber: string;

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
}
