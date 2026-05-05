import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class WhatsappSessionAuthDto {
  @ApiPropertyOptional({ description: 'Serialized Baileys creds object' })
  @IsOptional()
  @IsObject()
  creds?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Serialized Baileys keys object' })
  @IsOptional()
  @IsObject()
  keys?: Record<string, unknown>;
}

export class WhatsappSessionSettingsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  autoReconnect!: boolean;

  @ApiProperty({ example: 5 })
  @IsInt()
  maxReconnectAttempts!: number;

  @ApiProperty({ example: 60 })
  @IsInt()
  rateLimitPerMinute!: number;
}

export class CreateWhatsappSessionDto {
  @ApiProperty({ description: 'Workspace id' })
  @IsString()
  workspaceId!: string;

  @ApiProperty({ description: 'Session name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Phone number, optional' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ type: WhatsappSessionSettingsDto })
  @ValidateNested()
  settings!: WhatsappSessionSettingsDto;

  @ApiPropertyOptional({ type: WhatsappSessionAuthDto })
  @IsOptional()
  @ValidateNested()
  auth?: WhatsappSessionAuthDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
