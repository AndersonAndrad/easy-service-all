import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  email: string;

  @ApiProperty()
  cnpj: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  userName: string;

  @ApiProperty({ type: [String] })
  roles: string[];
}
