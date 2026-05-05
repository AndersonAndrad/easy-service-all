import { Test, TestingModule } from '@nestjs/testing';
import { CONVERSATION_REPOSITORY } from 'src/infra/database/mongodb/repository/mongoose-conversation.repository';
import { Conversation } from '../types/interface/conversation.interface';
import type { ConversationRepository } from '../types/repository/conversation.repository';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let repository: jest.Mocked<ConversationRepository>;

  const mockConversation: Conversation = {
    _id: 'id-1',
    createdAt: new Date(),
    workspaceId: 'ws-1',
    whatsappSessionId: 'session-1',
    conversationKey: '5511961234567:5521961234567:abc123',
    participants: {
      attendant: { name: 'attendant one', phone: '5511961234567' },
      client: { name: 'client one', phone: '5521961234567' },
    },
  };

  const mockRepository = {
    create: jest.fn(),
    findOneByParticipants: jest.fn(),
    findByConversationKey: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationService, { provide: CONVERSATION_REPOSITORY, useValue: mockRepository }],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    repository = module.get(CONVERSATION_REPOSITORY);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('builds entity from input and delegates to repository', async () => {
      const input: Omit<Conversation, '_id' | 'createdAt' | 'conversationKey'> = {
        participants: mockConversation.participants,
        workspaceId: mockConversation.workspaceId,
        whatsappSessionId: mockConversation.whatsappSessionId,
      };
      mockRepository.create.mockResolvedValue(mockConversation);

      const result = await service.create(input);

      expect(repository.create).toHaveBeenCalledTimes(1);
      const created = repository.create.mock.calls[0][0];
      expect(created.participants.attendant).toEqual(input.participants.attendant);
      expect(created.conversationKey).toBeDefined();
      expect(result).toBe(mockConversation);
    });
  });

  describe('findByConversationKey', () => {
    it('returns conversation from repository', async () => {
      mockRepository.findByConversationKey.mockResolvedValue(mockConversation);

      const result = await service.findByConversationKey('key-1');

      expect(repository.findByConversationKey).toHaveBeenCalledWith('key-1');
      expect(result).toBe(mockConversation);
    });
  });

  describe('getOrCreate', () => {
    it('returns existing conversation when found by participants', async () => {
      mockRepository.findOneByParticipants.mockResolvedValue(mockConversation);

      const result = await service.getOrCreate({
        participants: mockConversation.participants,
        workspaceId: mockConversation.workspaceId,
        whatsappSessionId: mockConversation.whatsappSessionId,
      });

      expect(repository.findOneByParticipants).toHaveBeenCalledWith(mockConversation.participants.attendant.phone, mockConversation.participants.client.phone);
      expect(repository.create).not.toHaveBeenCalled();
      expect(result).toBe(mockConversation);
    });

    it('creates and returns new conversation when not found', async () => {
      mockRepository.findOneByParticipants.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockConversation);

      const result = await service.getOrCreate({
        participants: mockConversation.participants,
        workspaceId: mockConversation.workspaceId,
        whatsappSessionId: mockConversation.whatsappSessionId,
      });

      expect(repository.findOneByParticipants).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockConversation);
    });
  });

  describe('update', () => {
    it('delegates partial to repository and returns updated conversation', async () => {
      const partial = { _id: 'id-1', conversationKey: 'key-1' };
      mockRepository.update.mockResolvedValue(mockConversation);

      const result = await service.update(partial);

      expect(repository.update).toHaveBeenCalledWith(partial);
      expect(result).toBe(mockConversation);
    });
  });
});
