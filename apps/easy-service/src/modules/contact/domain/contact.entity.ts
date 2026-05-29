import { BadRequestException } from '@nestjs/common';

export class ContactEntity {
  workspaceId: string;
  phone: string;
  name?: string;
  alias?: string;
  email?: string;
  avatar?: string;
  notes?: string;
  sharedFromId?: string;
  sharedByUserId?: string;

  constructor(params: { workspaceId: string; phone: string; name?: string; alias?: string; email?: string; avatar?: string; notes?: string; sharedFromId?: string; sharedByUserId?: string }) {
    this.workspaceId = params.workspaceId;
    this.phone = this.normalizePhone(params.phone);
    if (!this.phone) throw new BadRequestException('Contact phone must contain digits');

    if (params.name !== undefined) this.name = this.normalizeName(params.name);
    if (params.alias !== undefined) this.alias = this.normalizeName(params.alias);
    if (params.email !== undefined) {
      this.assertEmail(params.email);
      this.email = params.email.trim().toLowerCase();
    }
    if (params.avatar !== undefined) this.avatar = params.avatar.trim();
    if (params.notes !== undefined) this.notes = params.notes.trim();
    if (params.sharedFromId !== undefined) this.sharedFromId = params.sharedFromId;
    if (params.sharedByUserId !== undefined) this.sharedByUserId = params.sharedByUserId;
  }

  private normalizePhone(raw: string): string {
    return raw.trim().replace(/[^0-9+]/g, '');
  }

  private normalizeName(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ');
  }

  private assertEmail(raw: string): void {
    const trimmed = raw.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new BadRequestException(`Invalid email address: ${trimmed}`);
    }
  }
}
