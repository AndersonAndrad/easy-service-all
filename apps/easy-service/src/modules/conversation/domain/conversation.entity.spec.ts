import { BadRequestException } from '@nestjs/common';
import { randomHash } from 'src/shared/utils/hash.util';
import { ConversationEntity } from './conversation.entity';

jest.mock('src/shared/utils/hash.util', () => ({
  randomHash: jest.fn().mockReturnValue('mockedHash123'),
}));

const baseParticipants = {
  attendant: { name: 'Attendant One', phone: '+55 11 96123-4567' },
  client: { name: 'Client One', phone: '+55 21 96123-4567', customName: 'Custom' },
};

const baseConversationInput = {
  workspaceId: 'ws-test',
  whatsappSessionId: 'sess-test',
  participants: baseParticipants,
};

describe('ConversationEntity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('normalizes participant names (lowercase, spaces preserved) and phones (alphanumeric)', () => {
      const entity = new ConversationEntity(baseConversationInput);

      expect(entity.participants.attendant).toEqual({
        name: 'attendant one',
        phone: '5511961234567',
      });
      expect(entity.participants.client).toEqual({
        name: 'client one',
        phone: '5521961234567',
        customName: 'custom',
      });
    });

    it('generates conversationKey when not provided', () => {
      const entity = new ConversationEntity(baseConversationInput);

      expect(randomHash).toHaveBeenCalledTimes(1);
      expect(entity.conversationKey).toBe('5511961234567:5521961234567:mockedHash123');
    });

    it('keeps existing conversationKey when provided', () => {
      const existingKey = 'existing:key:value';
      const entity = new ConversationEntity({
        ...baseConversationInput,
        conversationKey: existingKey,
      });

      expect(randomHash).not.toHaveBeenCalled();
      expect(entity.conversationKey).toBe(existingKey);
    });

    it('handles empty or missing participant fields with empty string', () => {
      const entity = new ConversationEntity({
        workspaceId: 'ws-test',
        whatsappSessionId: 'sess-test',
        participants: {
          attendant: { name: '', phone: '' },
          client: { name: undefined as unknown as string, phone: null as unknown as string },
        },
      });

      expect(entity.participants.attendant).toEqual({ name: '', phone: '' });
      expect(entity.participants.client.name).toBe('');
      expect(entity.participants.client.phone).toBe('');
    });

    it('throws when attendant phone is not a valid Brazilian number', () => {
      expect(
        () =>
          new ConversationEntity({
            workspaceId: 'ws-test',
            whatsappSessionId: 'sess-test',
            participants: {
              attendant: { name: 'a', phone: '12345' },
              client: baseParticipants.client,
            },
          }),
      ).toThrow(BadRequestException);
    });

    it('throws when phone has no digits', () => {
      expect(
        () =>
          new ConversationEntity({
            workspaceId: 'ws-test',
            whatsappSessionId: 'sess-test',
            participants: {
              attendant: { name: 'a', phone: '---' },
              client: baseParticipants.client,
            },
          }),
      ).toThrow(BadRequestException);
    });

    it('throws when E.164 is too short for Brazil', () => {
      expect(
        () =>
          new ConversationEntity({
            workspaceId: 'ws-test',
            whatsappSessionId: 'sess-test',
            participants: {
              attendant: { name: 'a', phone: '5511' },
              client: baseParticipants.client,
            },
          }),
      ).toThrow(BadRequestException);
    });
  });
});
