import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, ValidateIf, IsEmail } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Username or email used to authenticate',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  identification!: string;

  @ApiProperty({
    description: 'Plain text password of the user',
    example: 'Pa$$w0rd',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
