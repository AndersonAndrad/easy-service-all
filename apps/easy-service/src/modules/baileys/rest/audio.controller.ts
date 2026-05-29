import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join, basename } from 'path';
import type { Message } from 'src/modules/conversation/types/interface/message.interface';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { AudioUploadService } from '../app/audio-upload.service';

const AUDIO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'audio');

@ApiTags('audio')
@Controller('audio')
export class AudioController {
  constructor(private readonly audioUploadService: AudioUploadService) {}

  // ── Upload flow (JWT-protected) ───────────────────────────────────────────────

  @Post('chunks/start')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initiate a chunked audio upload session' })
  start(@Body() body: { conversationKey: string; workspaceId: string; mimeType?: string }): { uploadId: string } {
    if (!body?.conversationKey || !body?.workspaceId) {
      throw new BadRequestException('conversationKey and workspaceId are required');
    }
    const uploadId = this.audioUploadService.startUpload(body.conversationKey, body.workspaceId, body.mimeType ?? 'audio/webm');
    return { uploadId };
  }

  @Post('chunks/:uploadId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload one chunk (base64-encoded audio bytes)' })
  chunk(@Param('uploadId') uploadId: string, @Body() body: { index: number; total: number; data: string }): void {
    if (body.index == null || body.total == null || !body.data) {
      throw new BadRequestException('index, total and data are required');
    }
    this.audioUploadService.addChunk(uploadId, Number(body.index), Number(body.total), body.data);
  }

  @Post('chunks/:uploadId/complete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Merge all chunks, send to WhatsApp, and persist the message' })
  async complete(@Param('uploadId') uploadId: string): Promise<Message> {
    return this.audioUploadService.completeUpload(uploadId);
  }

  // ── Audio file serving (no auth — UUID filename is the access token) ──────────

  @Get('file/:filename')
  @ApiOperation({ summary: 'Stream a saved audio file' })
  serveFile(@Param('filename') filename: string, @Res() res: Response): void {
    const safe = basename(filename); // prevent path traversal
    const filepath = join(AUDIO_UPLOAD_DIR, safe);
    if (!existsSync(filepath)) throw new NotFoundException('Audio file not found');

    const mimeType = safe.endsWith('.ogg') ? 'audio/ogg; codecs=opus' : 'audio/webm; codecs=opus';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    createReadStream(filepath).pipe(res);
  }
}
