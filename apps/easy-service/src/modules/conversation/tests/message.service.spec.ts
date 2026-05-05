import { Test, TestingModule } from '@nestjs/testing';
import { MESSAGE_REPOSITORY } from 'src/infra/database/mongodb/repository/mongoose-message.repository';
import { Message } from '../types/interface/message.interface';
import type { MessageRepository } from '../types/repository/message.repository';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';

describe('MessageService', () => {
  let service: MessageService;
  let messageRepository: jest.Mocked<MessageRepository>;
  let conversationService: jest.Mocked<ConversationService>;

  const mockConversation = {
    _id: 'conv-1',
    createdAt: new Date(),
    conversationKey: '5511961234567:5521961234567:xyz',
    participants: {
      attendant: { name: 'attendant', phone: '5511961234567' },
      client: { name: 'client', phone: '5521961234567' },
    },
  };

  const mockMessage: Message = {
    _id: 'id-1',
    createdAt: new Date(),
    conversationKey: mockConversation.conversationKey,
    sendBy: '5521961234567',
    payload: { text: 'Hi' },
    type: 'text',
    attendant: { name: 'attendant', phone: '5511961234567' },
    client: { name: 'client', phone: '5521961234567' },
  };

  const mockMessageRepository = {
    create: jest.fn(),
    findByConversationKey: jest.fn(),
    update: jest.fn(),
  };

  const mockConversationService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageService, { provide: MESSAGE_REPOSITORY, useValue: mockMessageRepository }, { provide: ConversationService, useValue: mockConversationService }],
    }).compile();

    service = module.get<MessageService>(MessageService);
    messageRepository = module.get(MESSAGE_REPOSITORY);
    conversationService = module.get(ConversationService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('ensures conversation exists then creates message with conversation conversationKey', async () => {
      mockConversationService.create.mockResolvedValue(mockConversation);
      mockMessageRepository.create.mockResolvedValue(mockMessage);

      const input: Omit<Message, '_id' | 'createdAt'> = {
        conversationKey: 'temp-key',
        workspaceId: 'ws-1',
        whatsappSessionId: 'sess-1',
        sendBy: mockMessage.sendBy,
        payload: mockMessage.payload,
        type: mockMessage.type,
        attendant: mockMessage.attendant,
        client: mockMessage.client,
      };

      const result = await service.create(input);

      expect(conversationService.create).toHaveBeenCalledWith({
        participants: {
          attendant: input.attendant,
          client: input.client,
        },
      });
      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...input,
          conversationKey: mockConversation.conversationKey,
        }),
      );
      expect(result).toBe(mockMessage);
    });
  });

  describe('findByConversationKey', () => {
    it('returns messages from repository', async () => {
      const messages = [mockMessage];
      mockMessageRepository.findByConversationKey.mockResolvedValue(messages);

      const result = await service.findByConversationKey('conv-key-1');

      expect(messageRepository.findByConversationKey).toHaveBeenCalledWith('conv-key-1');
      expect(result).toBe(messages);
    });
  });

  describe('update', () => {
    it('delegates to repository and returns updated message', async () => {
      const partial = { _id: 'id-1', payload: { text: 'Updated' } };
      mockMessageRepository.update.mockResolvedValue({ ...mockMessage, ...partial });

      const result = await service.update(partial);

      expect(messageRepository.update).toHaveBeenCalledWith(partial);
      expect(result.payload).toEqual({ text: 'Updated' });
    });
  });
});
