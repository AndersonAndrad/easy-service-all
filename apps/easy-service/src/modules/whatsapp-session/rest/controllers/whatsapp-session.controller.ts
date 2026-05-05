import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/shared/enums/roles.enum';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesAllowed } from 'src/shared/guards/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';

import { WhatsappSessionUseCases } from '../../app/use-cases/whatsapp-session.use-cases';
import { CreateWhatsappSessionDto } from '../../types/dto/create-whatsapp-session.dto';
import { UpdateWhatsappSessionDto } from '../../types/dto/update-whatsapp-session.dto';
import type { WhatsappSessionResponse } from '../../types/dto/whatsapp-session.response';
import { presentWhatsappSession } from '../presenters/whatsapp-session.presenter';

@ApiTags('whatsapp-session')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('whatsapp-sessions')
export class WhatsappSessionController {
  constructor(private readonly useCases: WhatsappSessionUseCases) {}

  private mapCreateAuth(auth: CreateWhatsappSessionDto['auth']): { creds: Record<string, unknown>; keys: Record<string, unknown> } | undefined {
    if (!auth?.creds || !auth?.keys) return undefined;
    return {
      creds: auth.creds,
      keys: auth.keys,
    };
  }

  private mapUpdateSettings(settings: UpdateWhatsappSessionDto['settings']): { autoReconnect: boolean; maxReconnectAttempts: number; rateLimitPerMinute: number } | undefined {
    if (!settings) return undefined;
    const { autoReconnect, maxReconnectAttempts, rateLimitPerMinute } = settings;
    if (typeof autoReconnect !== 'boolean' || typeof maxReconnectAttempts !== 'number' || typeof rateLimitPerMinute !== 'number') {
      return undefined;
    }
    return {
      autoReconnect,
      maxReconnectAttempts,
      rateLimitPerMinute,
    };
  }

  @Post()
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a WhatsApp session record' })
  async create(@Body() dto: CreateWhatsappSessionDto): Promise<WhatsappSessionResponse> {
    const session = await this.useCases.createWhatsappSession({
      workspaceId: dto.workspaceId,
      name: dto.name,
      phone: dto.phone,
      settings: {
        autoReconnect: dto.settings.autoReconnect,
        maxReconnectAttempts: dto.settings.maxReconnectAttempts,
        rateLimitPerMinute: dto.settings.rateLimitPerMinute,
      },
      auth: this.mapCreateAuth(dto.auth),
      metadata: dto.metadata,
    });
    return presentWhatsappSession(session);
  }

  @Patch(':id')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a WhatsApp session record' })
  async update(@Param('id') id: string, @Body() dto: UpdateWhatsappSessionDto): Promise<WhatsappSessionResponse> {
    const session = await this.useCases.updateWhatsappSession(id, {
      name: dto.name,
      phone: dto.phone,
      status: dto.status,
      settings: this.mapUpdateSettings(dto.settings),
      metadata: dto.metadata,
      auth: dto.auth,
    });
    return presentWhatsappSession(session);
  }

  @Delete(':id')
  @RolesAllowed(Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a WhatsApp session' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.useCases.deleteWhatsappSession(id);
  }

  @Get(':id')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get WhatsApp session by id' })
  async getById(@Param('id') id: string): Promise<WhatsappSessionResponse> {
    const session = await this.useCases.getWhatsappSessionById(id);
    return presentWhatsappSession(session);
  }

  @Get('by-workspace/:workspaceId')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'List WhatsApp sessions by workspace' })
  async listByWorkspace(@Param('workspaceId') workspaceId: string): Promise<WhatsappSessionResponse[]> {
    const list = await this.useCases.listWhatsappSessionsByWorkspace(workspaceId);
    return list.map(presentWhatsappSession);
  }

  @Post(':id/connect')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Connect a WhatsApp session' })
  async connect(@Param('id') id: string): Promise<WhatsappSessionResponse> {
    const session = await this.useCases.connectWhatsappSession(id);
    return presentWhatsappSession(session);
  }

  @Post(':id/disconnect')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Disconnect a WhatsApp session' })
  async disconnect(@Param('id') id: string): Promise<WhatsappSessionResponse> {
    const session = await this.useCases.disconnectWhatsappSession(id);
    return presentWhatsappSession(session);
  }

  @Post(':id/reconnect')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reconnect a WhatsApp session' })
  async reconnect(@Param('id') id: string): Promise<WhatsappSessionResponse> {
    const session = await this.useCases.reconnectWhatsappSession(id);
    return presentWhatsappSession(session);
  }

  @Get(':id/qr-code')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get QR code for a WhatsApp session if needed' })
  async getQrCode(@Param('id') id: string): Promise<{ qrCode: string | null }> {
    return this.useCases.getWhatsappSessionQrCode(id);
  }

  @Get(':id/status')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get WhatsApp session status' })
  async getStatus(@Param('id') id: string): Promise<{ status: string }> {
    return this.useCases.getWhatsappSessionStatus(id);
  }

  @Post(':id/replace')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Replace session auth and create a new authentication flow' })
  async replaceAuth(@Param('id') id: string): Promise<WhatsappSessionResponse> {
    const session = await this.useCases.replaceWhatsappSession(id);
    return presentWhatsappSession(session);
  }
}
