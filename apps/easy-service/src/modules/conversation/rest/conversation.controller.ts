import { BadRequestException, Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConversationService } from '../app/conversation.service';
import { Conversation } from '../types/interface/conversation.interface';

@ApiTags('conversation')
@Controller('conversations')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @Get(':workspaceId')
  async findByWorkspace(@Query('workspaceId') workspaceId: string): Promise<Conversation[]> {
    return this.conversationService.findByWorkspaceId(workspaceId);
  }

  @Patch(':conversationId/client-name')
  @ApiOperation({ summary: 'Update the custom display name for the client in a conversation' })
  async updateClientName(
    @Param('conversationId') conversationId: string,
    @Body() body: { customName: string },
  ): Promise<Conversation> {
    const customName = typeof body?.customName === 'string' ? body.customName.trim() : '';
    if (!customName) {
      throw new BadRequestException('customName is required');
    }
    return this.conversationService.updateClientName(conversationId, customName);
  }

  @Patch(':conversationKey/chat-name')
  @ApiOperation({ summary: 'Update the display name of a conversation' })
  async updateChatName(
    @Param('conversationKey') conversationKey: string,
    @Body() body: { chatName: string },
  ): Promise<Conversation> {
    const chatName = typeof body?.chatName === 'string' ? body.chatName.trim() : '';
    if (!chatName) {
      throw new BadRequestException('chatName is required');
    }
    return this.conversationService.updateChatName(conversationKey, chatName);
  }
}
