import { BadRequestException } from '@nestjs/common';
import { MessageType } from 'src/modules/conversation/types/enum/message-type.enum';
import { Message, MessageStatus } from 'src/modules/conversation/types/interface/message.interface';
import { randomHash } from 'src/shared/utils/hash.util';
import type { WhatsappMessageKey } from '../types/interfaces/text-message.interface';
import { WhatsappMessage } from '../types/interfaces/text-message.interface';

const MIN_PUSH_NAME_LENGTH = 3;
const JID_SUFFIX_GROUP = '@g.us';
const JID_SUFFIX_WHATSAPP = '@s.whatsapp.net';
const JID_SUFFIX_LEGACY = '@c.us';

export class TextMessageEntity implements Omit<Message, '_id' | 'createdAt'> {
  whatsappMessageId?: string;
  conversationKey: string;
  payload: { text: string };
  type: MessageType.text;
  sendBy: string;
  attendant: { name: string; phone: string };
  client: { name: string; phone: string };
  workspaceId: string;
  whatsappSessionId: string;
  status: MessageStatus = 'send';

  constructor(whatsappMessage: WhatsappMessage, attendant: { phone: string; name: string }, conversationKey?: string, clientNameOverride?: string) {
    this.validate(whatsappMessage);
    this.prepareAttendant(attendant);
    this.prepareClient(whatsappMessage, clientNameOverride);
    this.sendBy = this.resolveSendBy(whatsappMessage);
    this.objectAssign({
      whatsappMessageId: whatsappMessage.key?.id ?? undefined,
      workspaceId: whatsappMessage.workspaceId,
      whatsappSessionId: whatsappMessage.whatsappSessionId,
      payload: this.buildPayload(whatsappMessage),
      type: MessageType.text,
      conversationKey: conversationKey ?? this.buildConversationKey(),
      sendBy: this.sendBy,
      attendant: this.attendant,
      client: this.client,
    });
  }

  static fromSocketEvent(whatsappMessage: WhatsappMessage, attendantPhone: string, attendantName: string = '', conversationKey?: string): TextMessageEntity {
    return new TextMessageEntity(whatsappMessage, { phone: attendantPhone, name: attendantName }, conversationKey);
  }

  static extractClientFromMessage(message: WhatsappMessage): { phone: string; name: string } {
    const phoneRaw = TextMessageEntity.resolveClientPhoneFromKey(message?.key);
    const rawName = message?.pushName?.trim();
    const name = rawName && rawName.length > MIN_PUSH_NAME_LENGTH ? rawName : phoneRaw;
    return {
      name: name.trim().replace(/\s+/g, ' ').toLowerCase(),
      phone: TextMessageEntity.normalizePhoneUser(phoneRaw),
    };
  }

  private static isGroupJid(jid: string): boolean {
    return jid.endsWith(JID_SUFFIX_GROUP);
  }

  private static isWhatsAppPhoneJid(jid: string): boolean {
    return jid.endsWith(JID_SUFFIX_WHATSAPP) || jid.endsWith(JID_SUFFIX_LEGACY);
  }

  private static jidToUser(jid: string): string {
    const [user] = jid.split('@');
    return user ?? '';
  }

  /**
   * Single source for client identity: prefer @s.whatsapp.net / @c.us over @lid so
   * getOrCreate (extractClientFromMessage) and persisted messages (constructor) share one phone.
   */
  private static resolveClientPhoneFromKey(key: WhatsappMessageKey | undefined): string {
    if (!key?.remoteJid?.trim()) return '';

    const remoteJid = key.remoteJid.trim();

    if (TextMessageEntity.isGroupJid(remoteJid)) {
      const ordered = [key.participantAlt?.trim(), key.participant?.trim()].filter((j): j is string => Boolean(j));
      const pnJid = ordered.find((j: string): boolean => TextMessageEntity.isWhatsAppPhoneJid(j));
      if (pnJid) return TextMessageEntity.jidToUser(pnJid);
      const fallback = ordered[0];
      return fallback ? TextMessageEntity.jidToUser(fallback) : '';
    }

    const alt = key.remoteJidAlt?.trim();
    const orderedDm = [alt, remoteJid].filter((j): j is string => Boolean(j));
    const pnDm = orderedDm.find((j: string): boolean => TextMessageEntity.isWhatsAppPhoneJid(j));
    if (pnDm) return TextMessageEntity.jidToUser(pnDm);
    const nonGroup = orderedDm.find((j: string): boolean => !TextMessageEntity.isGroupJid(j));
    return nonGroup ? TextMessageEntity.jidToUser(nonGroup) : TextMessageEntity.jidToUser(remoteJid);
  }

  private static normalizePhoneUser(raw: string): string {
    return raw
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  private validate(obj: WhatsappMessage): void {
    if (!obj?.key?.remoteJid?.trim()) {
      throw new BadRequestException('TextMessageEntity: missing key.remoteJid');
    }
    const text = this.extractText(obj);
    if (text === undefined || String(text).trim() === '') {
      throw new BadRequestException('TextMessageEntity: missing text content (conversation or extendedTextMessage)');
    }
  }

  private extractText(obj: WhatsappMessage): string | undefined {
    const msg = obj?.message;
    if (!msg) return undefined;
    return msg.conversation ?? msg.extendedTextMessage?.text;
  }

  private buildPayload(obj: WhatsappMessage): { text: string } {
    const text = this.extractText(obj);
    return { text: String(text ?? '').trim() };
  }

  private prepareName(str: string): string {
    return str.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private preparePhone(str: string): string {
    return TextMessageEntity.normalizePhoneUser(str);
  }

  private prepareAttendant(attendant: { phone: string; name: string }): void {
    this.attendant = {
      name: this.prepareName(attendant.name ?? ''),
      phone: this.preparePhone(attendant.phone ?? ''),
    };
  }

  private prepareClient(obj: WhatsappMessage, nameOverride?: string): void {
    const phoneRaw = TextMessageEntity.resolveClientPhoneFromKey(obj.key);

    let name: string;
    if (nameOverride && nameOverride.trim().length > 0) {
      name = nameOverride.trim();
    } else {
      const rawName = obj?.pushName?.trim();
      name = rawName && rawName.length > MIN_PUSH_NAME_LENGTH ? rawName : phoneRaw;
    }

    this.client = {
      name: this.prepareName(name),
      phone: this.preparePhone(phoneRaw),
    };
  }

  private resolveSendBy(whatsappMessage: WhatsappMessage): string {
    if (whatsappMessage.sendBy?.trim()) {
      return this.preparePhone(whatsappMessage.sendBy);
    }
    return whatsappMessage.key.fromMe === true ? this.attendant.phone : this.client.phone;
  }

  private buildConversationKey(): string {
    return `${this.attendant.phone}:${this.client.phone}:${randomHash()}`;
  }

  private objectAssign(obj: Partial<Omit<Message, '_id' | 'createdAt'>>): void {
    Object.assign(this, obj);
  }
}
