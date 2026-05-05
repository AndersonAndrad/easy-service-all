import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Notation } from '../types/interface/notation.interface';

const MAX_CONTENT_LENGTH = 2000;
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export class NotationEntity implements Notation {
  id: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(content: string, ownerId: string) {
    this.content = NotationEntity.normalizeContent(content);
    this.ownerId = ownerId.trim();
    this.id = randomUUID();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static normalizeContent(raw: string): string {
    if (typeof raw !== 'string') {
      throw new BadRequestException('Notation content must be a string');
    }
    const normalized = raw.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      throw new BadRequestException('Notation content cannot be empty');
    }
    if (normalized.length > MAX_CONTENT_LENGTH) {
      throw new BadRequestException(`Notation content cannot exceed ${MAX_CONTENT_LENGTH} characters`);
    }
    return normalized;
  }

  static isWithinEditWindow(createdAt: Date): boolean {
    return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
  }
}
