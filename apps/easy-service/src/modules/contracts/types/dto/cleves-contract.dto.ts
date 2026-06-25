import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import type { ClevesContractData } from '@easy-service/shared';

export class ClevesContractDto implements ClevesContractData {
  @ApiProperty({ example: 'JAMIL DA SILVA PINTO' }) @IsString() @IsNotEmpty() fullName: string;
  @ApiProperty({ example: 'brasileiro' }) @IsString() @IsNotEmpty() nationality: string;
  @ApiProperty({ example: 'casado' }) @IsString() @IsNotEmpty() maritalStatus: string;
  @ApiProperty({ example: 'porteiro predial' }) @IsString() @IsNotEmpty() profession: string;
  @ApiProperty({ example: '874.240.109-72' }) @IsString() @IsNotEmpty() cpf: string;
  @ApiProperty({ example: 'Rua Heitor Busato' }) @IsString() @IsNotEmpty() street: string;
  @ApiProperty({ example: '99' }) @IsString() @IsNotEmpty() streetNumber: string;
  @ApiProperty({ example: 'São Gabriel' }) @IsString() @IsNotEmpty() neighborhood: string;
  @ApiProperty({ example: '83.407-060' }) @IsString() @IsNotEmpty() postalCode: string;
  @ApiProperty({ example: 'COLOMBO' }) @IsString() @IsNotEmpty() city: string;
  @ApiProperty({ example: 'PR' }) @IsString() @IsNotEmpty() state: string;
}
