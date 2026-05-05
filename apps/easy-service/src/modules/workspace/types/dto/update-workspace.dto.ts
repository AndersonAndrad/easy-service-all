import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ description: 'Workspace name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Optional document/reference' })
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional({ description: 'Custom interface settings' })
  @IsOptional()
  @IsObject()
  customInterface?: { color: string };

  @ApiPropertyOptional({ description: 'Whether the workspace is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
