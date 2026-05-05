import { BadRequestException } from '@nestjs/common';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { randomHash } from 'src/shared/utils/hash.util';
import { Conversation, ConversationParticipant, ConversationType } from '../types/interface/conversation.interface';

export class ConversationEntity {
  conversationKey: string;
  type: ConversationType;
  attendant: ConversationParticipant;
  participants: ConversationParticipant[];
  groupJid?: string;
  groupName?: string;
  chatName?: string;
  workspaceId: string;
  whatsappSessionId: string;

  constructor(param: Omit<Conversation, '_id' | 'createdAt' | 'conversationKey'>) {
    this.type = param.type ?? 'direct';
    this.prepareAttendant(param.attendant);

    if (this.type === 'group') {
      this.prepareGroupParticipants(param);
    } else {
      this.prepareDirectParticipants(param);
    }

    this.conversationKey = this.buildConversationKey(param);
    this.workspaceId = param.workspaceId;
    this.whatsappSessionId = param.whatsappSessionId;
    if (param.groupJid) this.groupJid = param.groupJid;
    if (param.groupName) {
      this.groupName = param.groupName;
      this.chatName = param.groupName;
    }
  }

  private buildConversationKey(param: Omit<Conversation, '_id' | 'createdAt' | 'conversationKey'>): string {
    if (this.type === 'group') {
      if (!param.groupJid?.trim()) throw new BadRequestException('Group conversation requires groupJid');
      const groupId = param.groupJid.split('@')[0];
      return `${this.attendant.phone}:${groupId}:${randomHash()}`;
    }
    return `${this.attendant.phone}:${this.participants[0].phone}:${randomHash()}`;
  }

  private prepareAttendant(attendant: ConversationParticipant): void {
    this.assertBrazilianPhone('Attendant', attendant?.phone ?? '');
    this.attendant = {
      name: this.prepareName(attendant?.name ?? ''),
      phone: this.preparePhone(attendant?.phone ?? ''),
    };
  }

  private prepareDirectParticipants(param: Omit<Conversation, '_id' | 'createdAt' | 'conversationKey'>): void {
    const client = param.participants?.[0];
    if (!client) throw new BadRequestException('Direct conversation requires at least one participant');
    this.assertBrazilianPhone('Client', client.phone ?? '');
    this.participants = [
      {
        name: this.prepareName(client.name ?? ''),
        phone: this.preparePhone(client.phone ?? ''),
        ...(client.customName ? { customName: this.prepareName(client.customName) } : {}),
      },
    ];
  }

  private prepareGroupParticipants(param: Omit<Conversation, '_id' | 'createdAt' | 'conversationKey'>): void {
    if (!param.groupJid?.trim()) throw new BadRequestException('Group conversation requires groupJid');
    this.participants = (param.participants ?? []).map((p) => ({
      name: this.prepareName(p.name ?? ''),
      phone: this.preparePhone(p.phone ?? ''),
      ...(p.customName ? { customName: this.prepareName(p.customName) } : {}),
    }));
  }

  private prepareName(str: string): string {
    return str.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private preparePhone(str: string): string {
    return str
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  private isValidBrazilianPhoneNumber(digits: string): boolean {
    if (!/^\d+$/.test(digits)) return false;
    if (digits.startsWith('55')) return isValidPhoneNumber(`+${digits}`);
    return isValidPhoneNumber(digits, 'BR');
  }

  private assertBrazilianPhone(label: string, raw: string): void {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) throw new BadRequestException(`${label} phone must contain digits`);
    if (!this.isValidBrazilianPhoneNumber(digits)) throw new BadRequestException(`${label} phone is not a valid Brazilian number`);
  }
}
