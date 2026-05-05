import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Message } from 'src/modules/conversation/types/interface/message.interface';
import { MessageService } from '../app/message.service';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messageService: MessageService) {}

  @Get('conversations/:conversationKey')
  async findMessagesByConversationKey(@Param('conversationKey') conversationKey: string): Promise<Message[]> {
    return this.messageService.findMessagesByConversationKey(conversationKey);
  }

  @Get('conversations')
  async findMessagesByConversationKeys(@Query('conversationKeys') conversationKeys: string[]): Promise<Message[]> {
    return this.messageService.findMessagesByConversationKeys(conversationKeys);
  }
}
