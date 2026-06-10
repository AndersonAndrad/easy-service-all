import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { MaternityMarcelloContractData } from '@easy-service/shared';

export class MaternityMarcelloContractDto implements MaternityMarcelloContractData {
  @ApiProperty({ example: 'Maria Silva Santos' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: 'Solteiro(a)' })
  @IsString()
  @IsNotEmpty()
  maritalStatus: string;

  @ApiProperty({ example: 'Professora' })
  @IsString()
  @IsNotEmpty()
  profession: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: '12345-678' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'Boa Vista' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'RR' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiPropertyOptional({ example: 'RR' })
  @IsOptional()
  @IsString()
  rgState?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  streetNumber?: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '(95) 99999-9999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;

  @ApiPropertyOptional({ example: 'Ana Santos' })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  guardianCpf?: string;
}
