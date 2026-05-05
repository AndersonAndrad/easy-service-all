import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class WhatsappSessionSettingsPatchDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoReconnect?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  maxReconnectAttempts?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  rateLimitPerMinute?: number;
}

export class UpdateWhatsappSessionDto {
  @ApiPropertyOptional({ description: 'Session name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Session status',
    example: 'connecting',
    enum: ['connecting', 'connected', 'disconnected', 'failed', 'reconnecting'],
  })
  @IsOptional()
  @IsString()
  status?: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'reconnecting';

  @ApiPropertyOptional({ type: WhatsappSessionSettingsPatchDto })
  @IsOptional()
  @ValidateNested()
  settings?: WhatsappSessionSettingsPatchDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Serialized Baileys auth state (creds/keys)',
    example: { creds: {}, keys: {} },
  })
  @IsOptional()
  @IsObject()
  auth?: { creds: Record<string, unknown>; keys: Record<string, unknown> };
}
