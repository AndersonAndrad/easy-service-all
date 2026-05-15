import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import type { MaternityContractData } from '@easy-service/shared';

export class MaternityContractDto implements MaternityContractData {
  @ApiProperty({ example: 'Maria Silva Santos' })
  @IsString() @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString() @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: 'Married' })
  @IsString() @IsNotEmpty()
  maritalStatus: string;

  @ApiProperty({ example: 'Teacher' })
  @IsString() @IsNotEmpty()
  profession: string;

  @ApiProperty({ example: 'Rua das Flores, 123' })
  @IsString() @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Centro' })
  @IsString() @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: '12345-678' })
  @IsString() @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString() @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString() @IsNotEmpty()
  state: string;
}
