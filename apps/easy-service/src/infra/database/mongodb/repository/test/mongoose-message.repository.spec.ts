import { Test, TestingModule } from '@nestjs/testing';
import { Message } from 'src/modules/conversation/types/interface/message.interface';
import { MESSAGE_REPOSITORY, MongooseMessageRepository } from '../mongoose-message.repository';

const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');

const mockMessageDoc = (overrides: Partial<Message> = {}) => {
  const base = {
    _id: 'id-1',
    createdAt: FIXED_DATE,
    conversationKey: '5511961234567:5521961234567:abcHashSuffix',
    workspaceId: 'ws-1',
    whatsappSessionId: 's-1',
    sendBy: '5521961234567',
    payload: { text: 'Hi' },
    type: 'text',
    attendant: { name: 'attendant', phone: '5511961234567' },
    client: { name: 'client', phone: '5521961234567' },
  };
  return { toObject: () => ({ ...base, ...overrides }) };
};

const mockCreate = jest.fn();
const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockConversationFindById = jest.fn();

jest.mock('../../schema/conversation.schema', () => ({
  conversationModel: {
    findById: (...args: unknown[]) => mockConversationFindById(...args),
  },
}));

jest.mock('../../schema/message.schema', () => ({
  messageModel: {
    create: (arg: unknown) => mockCreate(arg),
    find: (...args: unknown[]) => mockFind(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}));

describe('MongooseMessageRepository', () => {
  let repository: MongooseMessageRepository;

  const messageInput: Omit<Message, '_id' | 'createdAt'> = {
    conversationKey: '5511961234567:5521961234567:abcHashSuffix',
    workspaceId: 'ws-1',
    whatsappSessionId: 's-1',
    sendBy: '5521961234567',
    payload: { text: 'Hello' },
    type: 'text',
    attendant: { name: 'attendant', phone: '5511961234567' },
    client: { name: 'client', phone: '5521961234567' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: MESSAGE_REPOSITORY, useClass: MongooseMessageRepository }],
    }).compile();

    repository = module.get(MESSAGE_REPOSITORY);
    jest.clearAllMocks();
    mockConversationFindById.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve(null),
      }),
    });
  });

  describe('create', () => {
    it('calls model.create with message and returns parsed doc', async () => {
      const doc = mockMessageDoc(messageInput);
      mockCreate.mockResolvedValue(doc);

      const result = await repository.create(messageInput);

      expect(mockCreate).toHaveBeenCalledWith(messageInput);
      expect(result).toEqual(doc.toObject());
    });

    it('returns existing doc when duplicate whatsappMessageId', async () => {
      const duplicateError = Object.assign(new Error('E11000'), { code: 11000 });
      const inputWithId = { ...messageInput, whatsappMessageId: 'wa-msg-id-1' };
      const existingDoc = mockMessageDoc(inputWithId);
      mockCreate.mockRejectedValue(duplicateError);
      mockFindOne.mockResolvedValue(existingDoc);

      const result = await repository.create(inputWithId);

      expect(mockFindOne).toHaveBeenCalledWith({ whatsappMessageId: 'wa-msg-id-1' });
      expect(result).toEqual(existingDoc.toObject());
    });

    it('rethrows non-duplicate errors', async () => {
      const unexpectedError = new Error('db timeout');
      mockCreate.mockRejectedValue(unexpectedError);

      await expect(repository.create(messageInput)).rejects.toThrow('db timeout');
    });
  });

  describe('findMessagesByConversationKey', () => {
    it('returns empty array without querying when key is blank', async () => {
      const result = await repository.findMessagesByConversationKey('  ');

      expect(mockFind).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('finds by hash suffix with regex ending after last colon', async () => {
      const doc = mockMessageDoc();
      mockFind.mockResolvedValue([doc]);

      const result = await repository.findMessagesByConversationKey('abcHashSuffix');

      expect(mockFind).toHaveBeenCalledWith({
        conversationKey: /:abcHashSuffix$/,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(doc.toObject());
    });

    it('escapes regex metacharacters in hash suffix', async () => {
      mockFind.mockResolvedValue([]);

      await repository.findMessagesByConversationKey('a+b.c');

      expect(mockFind).toHaveBeenCalledWith({
        conversationKey: /:a\+b\.c$/,
      });
    });

    it('finds by full conversation key with exact match when value has three segments', async () => {
      const doc = mockMessageDoc();
      mockFind.mockResolvedValue([doc]);
      const fullKey = '5511961234567:5521961234567:abcHashSuffix';

      const result = await repository.findMessagesByConversationKey(fullKey);

      expect(mockFind).toHaveBeenCalledWith({ conversationKey: fullKey });
      expect(result).toHaveLength(1);
    });

    it('resolves Conversation _id to conversationKey then finds messages', async () => {
      const conversationId = '507f1f77bcf86cd799439011';
      const fullKey = '5511961234567:5521961234567:abcHashSuffix';
      mockConversationFindById.mockReturnValueOnce({
        select: () => ({
          lean: () => Promise.resolve({ conversationKey: fullKey }),
        }),
      });
      const doc = mockMessageDoc();
      mockFind.mockResolvedValue([doc]);

      const result = await repository.findMessagesByConversationKey(conversationId);

      expect(mockConversationFindById).toHaveBeenCalledWith(conversationId);
      expect(mockFind).toHaveBeenCalledWith({ conversationKey: fullKey });
      expect(result).toHaveLength(1);
    });
  });

  describe('findMessagesByConversationKeys', () => {
    it('returns empty array when all keys are blank', async () => {
      const result = await repository.findMessagesByConversationKeys(['', '  ']);

      expect(mockFind).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('builds $or with suffix regex and full keys', async () => {
      const doc = mockMessageDoc();
      mockFind.mockResolvedValue([doc]);

      await repository.findMessagesByConversationKeys(['hashOne', '111:222:333']);

      expect(mockFind).toHaveBeenCalledWith({
        $or: [{ conversationKey: /:hashOne$/ }, { conversationKey: '111:222:333' }],
      });
    });
  });

  describe('update', () => {
    it('calls findByIdAndUpdate with _id and update payload', async () => {
      const doc = mockMessageDoc({ _id: 'id-1', payload: { text: 'Updated' } });
      mockFindByIdAndUpdate.mockResolvedValue(doc);

      const result = await repository.update({ _id: 'id-1', payload: { text: 'Updated' } });

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('id-1', { _id: 'id-1', payload: { text: 'Updated' } }, expect.any(Object));
      expect(result).toEqual(doc.toObject());
    });
  });
});
