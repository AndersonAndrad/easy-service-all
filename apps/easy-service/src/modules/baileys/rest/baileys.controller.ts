import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { SocketHandshakeGuard } from 'src/shared/guards/socket-handshake.guard';
import { WorkspaceAccessGuard } from 'src/shared/guards/workspace-access.guard';
import { BaileysService } from '../app/baileys.service';

@ApiTags('baileys')
@Controller('baileys')
export class BaileysController {
  constructor(private readonly baileysService: BaileysService) {}

  @Post('send-message')
  @ApiOperation({
    summary: 'Send a WhatsApp text message (requires active in-process session)',
  })
  async sendMessage(@Body() body: { phone: string; message: string; sessionId?: string }): Promise<{ success: boolean; from: string; to: string }> {
    return this.baileysService.sendMessage(body.phone, body.message, body.sessionId);
  }

  @Post('request-connection/:workspaceId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SocketHandshakeGuard, WorkspaceAccessGuard)
  @ApiOperation({
    summary: 'Request WhatsApp QR connection flow; QR and status are emitted on socket topics for the workspace',
  })
  async requestConnection(@Param('workspaceId') workspaceId: string): Promise<{ workspaceId: string; status: 'connecting' }> {
    return this.baileysService.requestNewQrCode(workspaceId);
  }

  @Get('request-connection')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SocketHandshakeGuard, WorkspaceAccessGuard)
  @ApiOperation({
    summary: 'Same as POST request-connection/:workspaceId with workspaceId as query parameter',
  })
  async requestConnectionQuery(@Query('workspaceId') workspaceId: string): Promise<{ workspaceId: string; status: 'connecting' }> {
    if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      throw new BadRequestException('workspaceId query parameter is required');
    }
    return this.baileysService.requestNewQrCode(workspaceId.trim());
  }

  @Post('workspaces/:workspaceId/new-qrcode')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SocketHandshakeGuard, WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Legacy alias for request-connection' })
  async requestNewQrCode(@Param('workspaceId') workspaceId: string): Promise<{ workspaceId: string; status: 'connecting' }> {
    return this.baileysService.requestNewQrCode(workspaceId);
  }
}
