import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportContactDto {
  @ApiProperty({
    description: 'ID of the contact to import from another workspace',
    example: '665f1a2b3c4d5e6f7a8b9c0d',
  })
  @IsString()
  @IsNotEmpty()
  contactId!: string;
}
