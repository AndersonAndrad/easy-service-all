import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';

import type { WhatsappSession } from 'src/modules/whatsapp-session/types/interfaces/whatsapp-session.interface';
import type { WhatsappSessionInsert, WhatsappSessionRepository } from 'src/modules/whatsapp-session/types/repository/whatsapp-session.repository';
import { parseDocumentToObj } from 'src/shared/utils/mongoose.utils';

import { whatsappSessionModel } from '../schema/whatsapp-session.schema';

@Injectable()
export class MongooseWhatsappSessionRepository implements WhatsappSessionRepository {
  private normalizeAuth(auth: unknown): WhatsappSession['auth'] {
    if (auth && typeof auth === 'object' && !Array.isArray(auth)) {
      const o = auth as Record<string, unknown>;
      return {
        creds: o.creds !== undefined && o.creds !== null ? o.creds : {},
        keys: o.keys !== undefined && o.keys !== null ? o.keys : {},
      };
    }
    return { creds: {}, keys: {} };
  }

  private normalizeSettings(settings: unknown): WhatsappSession['settings'] {
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      const s = settings as Record<string, unknown>;
      return {
        autoReconnect: typeof s.autoReconnect === 'boolean' ? s.autoReconnect : true,
        maxReconnectAttempts: typeof s.maxReconnectAttempts === 'number' ? s.maxReconnectAttempts : 5,
        rateLimitPerMinute: typeof s.rateLimitPerMinute === 'number' ? s.rateLimitPerMinute : 60,
      };
    }
    return {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      rateLimitPerMinute: 60,
    };
  }

  private toMillis(value: unknown): number {
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const t = new Date(value).getTime();
      return Number.isNaN(t) ? Date.now() : t;
    }
    return Date.now();
  }

  private toDomain(doc: unknown): WhatsappSession {
    const raw = parseDocumentToObj(doc) as WhatsappSession & { createdAt?: unknown; updatedAt?: unknown };
    const sessionId = raw.sessionId ? raw.sessionId : String(raw._id);
    return {
      ...raw,
      sessionId,
      auth: this.normalizeAuth(raw.auth),
      settings: this.normalizeSettings(raw.settings),
      createdAt: this.toMillis(raw.createdAt),
      updatedAt: this.toMillis(raw.updatedAt),
    };
  }

  async create(input: WhatsappSessionInsert): Promise<WhatsappSession> {
    try {
      const created = await whatsappSessionModel.create(input);
      return this.toDomain(created);
    } catch (caught: unknown) {
      const err = caught as { code?: number };
      if (err.code === 11000) throw new BadRequestException('Whatsapp session already exists');
      if (caught instanceof HttpException) throw caught;
      if (caught instanceof Error && (caught.name === 'ValidationError' || caught.name === 'CastError')) {
        throw new BadRequestException(caught.message);
      }
      const detail = caught instanceof Error ? caught.message : String(caught);
      throw new InternalServerErrorException(`Failed to create Whatsapp session: ${detail}`);
    }
  }

  async update(id: string, input: Partial<Omit<WhatsappSession, '_id' | 'workspaceId' | 'createdAt'>>): Promise<WhatsappSession> {
    const updated = await whatsappSessionModel.findByIdAndUpdate(id, { ...input, updatedAt: Date.now() }, { returnDocument: 'after' });

    if (!updated) {
      throw new BadRequestException('Whatsapp session not found');
    }

    return this.toDomain(updated);
  }

  async updateBySessionId(sessionId: string, input: Partial<Omit<WhatsappSession, '_id' | 'workspaceId' | 'createdAt' | 'sessionId'>>): Promise<WhatsappSession> {
    const updated = await whatsappSessionModel.findOneAndUpdate({ sessionId }, { ...input, updatedAt: Date.now() }, { returnDocument: 'after' });

    if (!updated) {
      throw new BadRequestException('Whatsapp session not found');
    }

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await whatsappSessionModel.deleteOne({ _id: id });
  }

  async deleteByWorkspaceId(workspaceId: string): Promise<void> {
    await whatsappSessionModel.deleteMany({ workspaceId });
  }

  async findById(id: string): Promise<WhatsappSession | null> {
    const doc = await whatsappSessionModel.findById(id).exec();
    if (!doc) return null;

    return this.toDomain(doc);
  }

  async findBySessionId(sessionId: string): Promise<WhatsappSession | null> {
    const doc = await whatsappSessionModel.findOne({ sessionId }).exec();
    if (!doc) return null;

    return this.toDomain(doc);
  }

  async listByWorkspaceId(workspaceId: string): Promise<WhatsappSession[]> {
    const docs = await whatsappSessionModel.find({ workspaceId }).exec();
    return docs.map((doc): WhatsappSession => this.toDomain(doc));
  }

  private isCredRegistered(session: WhatsappSession): boolean {
    const c = session.auth?.creds as { registered?: boolean } | undefined;
    return Boolean(c && typeof c === 'object' && c.registered === true);
  }

  async listSessionsEligibleForAutoReconnect(): Promise<WhatsappSession[]> {
    const docs = await whatsappSessionModel
      .find({
        isActive: true,
        status: { $nin: ['failed'] },
      })
      .exec();

    const sessions = docs.map((doc): WhatsappSession => this.toDomain(doc));
    return sessions.filter((s) => this.isCredRegistered(s) || s.status === 'reconnecting');
  }

  async listAll(): Promise<WhatsappSession[]> {
    const docs = await whatsappSessionModel.find({}).exec();
    return docs.map((doc): WhatsappSession => this.toDomain(doc));
  }

  async listSessionsForCronReconciliation(): Promise<WhatsappSession[]> {
    const docs = await whatsappSessionModel
      .find({
        isActive: true,
        $or: [{ status: { $ne: 'connected' } }, { status: 'connected' }],
      })
      .exec();
    return docs.map((doc): WhatsappSession => this.toDomain(doc));
  }
}
