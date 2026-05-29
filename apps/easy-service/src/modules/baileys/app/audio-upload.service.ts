import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Message } from 'src/modules/conversation/types/interface/message.interface';
import { BaileysService } from './baileys.service';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface UploadSession {
  chunks: Map<number, Buffer>;
  total: number;
  conversationKey: string;
  workspaceId: string;
  mimeType: string;
  createdAt: number;
}

const SESSION_TTL_MS = 10 * 60 * 1000;
const AUDIO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'audio');

@Injectable()
export class AudioUploadService {
  private readonly logger = new Logger(AudioUploadService.name);
  private readonly uploads = new Map<string, UploadSession>();

  constructor(private readonly baileysService: BaileysService) {}

  startUpload(conversationKey: string, workspaceId: string, mimeType: string): string {
    if (!conversationKey?.trim() || !workspaceId?.trim()) {
      throw new BadRequestException('conversationKey and workspaceId are required');
    }
    this.evictExpired();
    const uploadId = crypto.randomUUID();
    this.uploads.set(uploadId, {
      chunks: new Map(),
      total: 0,
      conversationKey: conversationKey.trim(),
      workspaceId: workspaceId.trim(),
      mimeType: mimeType?.trim() || 'audio/webm',
      createdAt: Date.now(),
    });
    return uploadId;
  }

  addChunk(uploadId: string, index: number, total: number, data: string): void {
    const session = this.getSession(uploadId);
    if (index < 0 || total < 1 || index >= total) {
      throw new BadRequestException(`Invalid chunk index ${index} for total ${total}`);
    }
    session.chunks.set(index, Buffer.from(data, 'base64'));
    session.total = total;
  }

  async completeUpload(uploadId: string): Promise<Message> {
    const session = this.getSession(uploadId);

    if (session.total === 0 || session.chunks.size === 0) {
      throw new BadRequestException('No chunks received');
    }

    const buffers: Buffer[] = [];
    for (let i = 0; i < session.total; i++) {
      const chunk = session.chunks.get(i);
      if (!chunk) throw new BadRequestException(`Missing chunk ${i} of ${session.total}`);
      buffers.push(chunk);
    }

    const rawBuffer = Buffer.concat(buffers);
    this.uploads.delete(uploadId);

    await mkdir(AUDIO_UPLOAD_DIR, { recursive: true });

    const baseName = crypto.randomUUID();

    // Save original file for frontend playback (keep browser format)
    const origExt = session.mimeType.includes('ogg') ? 'ogg' : 'webm';
    const origFilename = `${baseName}.${origExt}`;
    await writeFile(join(AUDIO_UPLOAD_DIR, origFilename), rawBuffer);
    const audioUrl = `/audio/file/${origFilename}`;

    // Convert to OGG/Opus for WhatsApp — required container format for PTT
    let whatsappBuffer: Buffer;
    try {
      whatsappBuffer = await this.convertToOggOpus(rawBuffer);
    } catch (err) {
      this.logger.warn(`Audio conversion failed, sending raw buffer: ${err instanceof Error ? err.message : String(err)}`);
      whatsappBuffer = rawBuffer;
    }

    return this.baileysService.sendAudioToConversation(session.conversationKey, session.workspaceId, whatsappBuffer, audioUrl, 'audio/ogg; codecs=opus');
  }

  private async convertToOggOpus(inputBuffer: Buffer): Promise<Buffer> {
    const tmpIn = join(tmpdir(), `${crypto.randomUUID()}.webm`);
    const tmpOut = join(tmpdir(), `${crypto.randomUUID()}.ogg`);
    try {
      await writeFile(tmpIn, inputBuffer);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpIn).audioCodec('libopus').audioChannels(1).audioFrequency(48000).format('ogg').output(tmpOut).on('end', resolve).on('error', reject).run();
      });
      return await readFile(tmpOut);
    } finally {
      await rm(tmpIn, { force: true });
      await rm(tmpOut, { force: true });
    }
  }

  private getSession(uploadId: string): UploadSession {
    const session = this.uploads.get(uploadId);
    if (!session) throw new NotFoundException('Upload session not found or expired');
    return session;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.uploads) {
      if (now - session.createdAt > SESSION_TTL_MS) this.uploads.delete(id);
    }
  }
}
