import { Test, TestingModule } from '@nestjs/testing';
import { Conversation } from 'src/modules/conversation/types/interface/conversation.interface';
import { CONVERSATION_REPOSITORY, MongooseConversationRepository } from '../mongoose-conversation.repository';

const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');

const mockConversationDoc = (overrides: Partial<Conversation> = {}) => {
  const base = {
    _id: 'id-1',
    createdAt: FIXED_DATE,
    workspaceId: 'ws-1',
    whatsappSessionId: 'session-1',
    conversationKey: '5511961234567:5521961234567:abc123',
    participants: {
      attendant: { name: 'attendant', phone: '5511961234567' },
      client: { name: 'client', phone: '5521961234567' },
    },
  };
  return { toObject: () => ({ ...base, ...overrides }) };
};

const mockFindOneAndUpdate = jest.fn();
const mockFindOne = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.mock('../../schema/conversation.schema', () => ({
  conversationModel: {
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}));

describe('MongooseConversationRepository', () => {
  let repository: MongooseConversationRepository;

  const conversationInput: Omit<Conversation, '_id' | 'createdAt'> = {
    conversationKey: '5511961234567:5521961234567:newHash',
    workspaceId: 'ws-1',
    whatsappSessionId: 'session-1',
    participants: {
      attendant: { name: 'attendant', phone: '5511961234567' },
      client: { name: 'client', phone: '5521961234567' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: CONVERSATION_REPOSITORY, useClass: MongooseConversationRepository }],
    }).compile();

    repository = module.get(CONVERSATION_REPOSITORY);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('calls findOneAndUpdate with regex filter and upsert', async () => {
      const doc = mockConversationDoc(conversationInput);
      mockFindOneAndUpdate.mockResolvedValue(doc);

      await repository.create(conversationInput);

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationKey: expect.any(Object),
        }),
        expect.objectContaining({
          $set: {
            participants: conversationInput.participants,
            workspaceId: conversationInput.workspaceId,
            whatsappSessionId: conversationInput.whatsappSessionId,
          },
          $setOnInsert: { conversationKey: conversationInput.conversationKey },
        }),
        expect.objectContaining({ upsert: true, returnDocument: 'after' }),
      );
    });

    it('returns parsed conversation from result', async () => {
      const doc = mockConversationDoc(conversationInput);
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const result = await repository.create(conversationInput);

      expect(result).toEqual(doc.toObject());
    });
  });

  describe('findOneByParticipants', () => {
    it('finds by regex on conversationKey and returns parsed doc or null', async () => {
      const doc = mockConversationDoc();
      mockFindOne.mockResolvedValue(doc);

      const result = await repository.findOneByParticipants('5511961234567', '5521961234567');

      expect(mockFindOne).toHaveBeenCalledWith(expect.objectContaining({ conversationKey: expect.any(Object) }));
      expect(result).toEqual(doc.toObject());
    });

    it('returns null when no document found', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await repository.findOneByParticipants('5511961234567', '5521961234567');

      expect(result).toBeNull();
    });
  });

  describe('findByConversationKey', () => {
    it('finds by exact conversationKey and returns parsed doc', async () => {
      const doc = mockConversationDoc();
      mockFindOne.mockResolvedValue(doc);

      const result = await repository.findByConversationKey('key-123');

      expect(mockFindOne).toHaveBeenCalledWith({ conversationKey: 'key-123' });
      expect(result).toEqual(doc.toObject());
    });
  });

  describe('update', () => {
    it('calls findByIdAndUpdate with _id and returns parsed doc', async () => {
      const doc = mockConversationDoc({ _id: 'id-1' });
      mockFindByIdAndUpdate.mockResolvedValue(doc);

      const result = await repository.update({ _id: 'id-1', conversationKey: 'updated-key' });

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('id-1', { _id: 'id-1', conversationKey: 'updated-key' }, expect.any(Object));
      expect(result).toEqual(doc.toObject());
    });
  });
});
