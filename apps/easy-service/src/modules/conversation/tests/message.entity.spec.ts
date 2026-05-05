import { MessageEntity } from '../domain/message.entity';
import { MessageType } from '../types/enum/message-type.enum';
import { Message } from '../types/interface/message.interface';

const baseMessage: Omit<Message, '_id' | 'createdAt'> = {
  conversationKey: 'conv-key-1',
  workspaceId: 'ws-1',
  whatsappSessionId: 'sess-1',
  sendBy: '5511888882222',
  payload: { text: 'Hello' },
  type: MessageType.text,
  attendant: { name: 'Attendant Name', phone: '+55 11 99999-1111' },
  client: { name: 'Client Name', phone: '+55 11 88888-2222' },
};

describe('MessageEntity', () => {
  describe('constructor', () => {
    it('normalizes attendant and client names (lowercase, spaces preserved) and phones (alphanumeric)', () => {
      const entity = new MessageEntity(baseMessage);

      expect(entity.attendant).toEqual({
        name: 'attendant name',
        phone: '5511999991111',
      });
      expect(entity.client).toEqual({
        name: 'client name',
        phone: '5511888882222',
      });
    });

    it('assigns conversationKey, payload and type', () => {
      const entity = new MessageEntity(baseMessage);

      expect(entity.conversationKey).toBe('conv-key-1');
      expect(entity.payload).toEqual({ text: 'Hello' });
      expect(entity.type).toBe(MessageType.text);
    });

    it('handles empty or missing attendant and client fields', () => {
      const entity = new MessageEntity({
        ...baseMessage,
        attendant: { name: '', phone: '' },
        client: { name: undefined as unknown as string, phone: null as unknown as string },
      });

      expect(entity.attendant).toEqual({ name: '', phone: '' });
      expect(entity.client.name).toBe('');
      expect(entity.client.phone).toBe('');
    });
  });
});
