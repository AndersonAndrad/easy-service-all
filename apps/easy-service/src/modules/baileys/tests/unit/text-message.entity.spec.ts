import { MessageType } from 'src/modules/conversation/types/enum/message-type.enum';
import { TextMessageEntity } from '../../domain/text-message.entity';
import { WhatsappMessage } from '../../types/interfaces/text-message.interface';

const baseWhatsappMessage: WhatsappMessage = {
  key: {
    remoteJid: '5511888882222@s.whatsapp.net',
    remoteJidAlt: '5511888882222@s.whatsapp.net',
    fromMe: false,
    id: 'msg-1',
    participant: '',
    participantAlt: '',
    addressingMode: 'jid',
  },
  messageTimestamp: 1234567890,
  pushName: 'Client Name',
  broadcast: false,
  message: { conversation: 'Hello' },
};

const attendant = { phone: '5511999991111', name: 'Anderson Andrade' };

describe('TextMessageEntity', () => {
  describe('constructor', () => {
    it('normalizes attendant and client names (spaces preserved) and phones', () => {
      const entity = new TextMessageEntity(baseWhatsappMessage, attendant);

      expect(entity.attendant).toEqual({
        name: 'anderson andrade',
        phone: '5511999991111',
      });
      expect(entity.client.name).toBe('client name');
      expect(entity.client.phone).toBe('5511888882222');
      expect(entity.sendBy).toBe('5511888882222');
    });

    it('sets sendBy to attendant phone when fromMe is true', () => {
      const outbound: WhatsappMessage = {
        ...baseWhatsappMessage,
        key: { ...baseWhatsappMessage.key, fromMe: true },
      };
      const entity = new TextMessageEntity(outbound, attendant);

      expect(entity.sendBy).toBe('5511999991111');
    });

    it('uses explicit sendBy when provided on payload', () => {
      const entity = new TextMessageEntity({ ...baseWhatsappMessage, sendBy: '+55 11 90000-0000' }, attendant);

      expect(entity.sendBy).toBe('5511900000000');
    });

    it('assigns payload text from conversation', () => {
      const entity = new TextMessageEntity(baseWhatsappMessage, attendant, 'stable-key');

      expect(entity.payload).toEqual({ text: 'Hello' });
      expect(entity.type).toBe(MessageType.text);
      expect(entity.conversationKey).toBe('stable-key');
    });

    it('uses extendedTextMessage when conversation is absent', () => {
      const msg: WhatsappMessage = {
        ...baseWhatsappMessage,
        message: { extendedTextMessage: { text: 'Long text' } },
      };
      const entity = new TextMessageEntity(msg, attendant, 'key-1');

      expect(entity.payload).toEqual({ text: 'Long text' });
    });

    it('throws when key.remoteJid is missing', () => {
      const msg = {
        ...baseWhatsappMessage,
        key: { ...baseWhatsappMessage.key, remoteJid: '' },
      };

      expect(() => new TextMessageEntity(msg as WhatsappMessage, attendant)).toThrow('TextMessageEntity: missing key.remoteJid');
    });

    it('throws when text content is missing', () => {
      const msg = { ...baseWhatsappMessage, message: {} };

      expect(() => new TextMessageEntity(msg as WhatsappMessage, attendant)).toThrow('TextMessageEntity: missing text content');
    });
  });

  describe('fromSocketEvent', () => {
    it('returns entity with same result as constructor', () => {
      const entity = TextMessageEntity.fromSocketEvent(baseWhatsappMessage, '5511999991111', 'Attendant', 'key-1');

      expect(entity.conversationKey).toBe('key-1');
      expect(entity.attendant.name).toBe('attendant');
      expect(entity.payload.text).toBe('Hello');
    });
  });

  describe('extractClientFromMessage', () => {
    it('extracts and normalizes client from DM message', () => {
      const client = TextMessageEntity.extractClientFromMessage(baseWhatsappMessage);

      expect(client.phone).toBe('5511888882222');
      expect(client.name).toBe('client name');
    });

    it('uses pushName when length > 3 otherwise phone as name', () => {
      const shortName = { ...baseWhatsappMessage, pushName: 'Ab' };
      const client = TextMessageEntity.extractClientFromMessage(shortName);

      expect(client.name).toBe('5511888882222');
    });

    it('extracts client phone from group participantAlt', () => {
      const groupMsg: WhatsappMessage = {
        ...baseWhatsappMessage,
        key: {
          ...baseWhatsappMessage.key,
          remoteJid: '120363363388573665@g.us',
          participantAlt: '5511777777777@s.whatsapp.net',
        },
      };
      const client = TextMessageEntity.extractClientFromMessage(groupMsg);

      expect(client.phone).toBe('5511777777777');
    });

    it('resolves client when remoteJidAlt is absent (DM)', () => {
      const msg: WhatsappMessage = {
        ...baseWhatsappMessage,
        key: {
          remoteJid: '5511888882222@s.whatsapp.net',
          fromMe: false,
          id: 'msg-1',
          addressingMode: 'jid',
        },
      };
      const fromStatic = TextMessageEntity.extractClientFromMessage(msg);
      const entity = new TextMessageEntity(msg, attendant, 'k');

      expect(fromStatic.phone).toBe('5511888882222');
      expect(entity.client.phone).toBe('5511888882222');
    });

    it('prefers @s.whatsapp.net over @lid on remoteJidAlt for DM (matches constructor)', () => {
      const msg: WhatsappMessage = {
        ...baseWhatsappMessage,
        key: {
          ...baseWhatsappMessage.key,
          remoteJid: '12345678901234567@lid',
          remoteJidAlt: '5511888882222@s.whatsapp.net',
        },
      };
      const fromStatic = TextMessageEntity.extractClientFromMessage(msg);
      const entity = new TextMessageEntity(msg, attendant, 'k');

      expect(fromStatic.phone).toBe('5511888882222');
      expect(entity.client.phone).toBe('5511888882222');
    });

    it('prefers @s.whatsapp.net over @lid when PN is on remoteJid only', () => {
      const msg: WhatsappMessage = {
        ...baseWhatsappMessage,
        key: {
          ...baseWhatsappMessage.key,
          remoteJid: '5511888882222@s.whatsapp.net',
          remoteJidAlt: '99988877766655544@lid',
        },
      };
      const fromStatic = TextMessageEntity.extractClientFromMessage(msg);
      const entity = new TextMessageEntity(msg, attendant, 'k');

      expect(fromStatic.phone).toBe('5511888882222');
      expect(entity.client.phone).toBe('5511888882222');
    });

    it('group: prefers participantAlt phone JID over participant @lid', () => {
      const groupMsg: WhatsappMessage = {
        ...baseWhatsappMessage,
        key: {
          ...baseWhatsappMessage.key,
          remoteJid: '120363363388573665@g.us',
          remoteJidAlt: '120363363388573665@g.us',
          participant: '11122233344455566@lid',
          participantAlt: '5511999888777@s.whatsapp.net',
        },
      };
      const client = TextMessageEntity.extractClientFromMessage(groupMsg);
      const entity = new TextMessageEntity(groupMsg, attendant, 'k');

      expect(client.phone).toBe('5511999888777');
      expect(entity.client.phone).toBe('5511999888777');
    });
  });

  describe('constructor with group message (retrieveClientPhone)', () => {
    it('uses participant jid for client phone when group has participant', () => {
      const groupMsg: WhatsappMessage = {
        ...baseWhatsappMessage,
        key: {
          ...baseWhatsappMessage.key,
          remoteJid: '120363363388573665@g.us',
          remoteJidAlt: '120363363388573665@g.us',
          participant: '5511777777777@s.whatsapp.net',
        },
        message: { conversation: 'Group hello' },
      };
      const entity = new TextMessageEntity(groupMsg, attendant, 'conv-key');

      expect(entity.client.phone).toBe('5511777777777');
      expect(entity.payload.text).toBe('Group hello');
    });

    it('uses participantAlt when group has participantAlt and no participant', () => {
      const groupMsg: WhatsappMessage = {
        ...baseWhatsappMessage,
        key: {
          ...baseWhatsappMessage.key,
          remoteJid: '120363363388573665@g.us',
          remoteJidAlt: '120363363388573665@g.us',
          participantAlt: '5511888888888@s.whatsapp.net',
        },
        message: { conversation: 'Group hi' },
      };
      const entity = new TextMessageEntity(groupMsg, attendant, 'conv-key');

      expect(entity.client.phone).toBe('5511888888888');
    });
  });
});
