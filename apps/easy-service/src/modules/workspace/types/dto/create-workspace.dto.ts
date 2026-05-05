import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Workspace name', example: 'My Workspace' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Optional document/reference', example: 'doc-123' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiProperty({ description: 'Custom interface settings', example: { color: 'blue' } })
  @IsObject()
  customInterface!: { color: string };

  @ApiProperty({ description: 'Whether the workspace is active', example: true })
  @IsBoolean()
  isActive!: boolean;
}
