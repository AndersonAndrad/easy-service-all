import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { NotationService } from '../app/notation.service';
import { Notation } from '../types/interface/notation.interface';

type AuthRequest = Request & { auth: { userId: string } };

@ApiTags('conversation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class NotationsController {
  constructor(private readonly notationService: NotationService) {}

  @Post(':conversationKey/notations')
  @ApiOperation({ summary: 'Add a notation to a conversation' })
  async create(@Param('conversationKey') conversationKey: string, @Body() body: { content: string }, @Req() req: AuthRequest): Promise<Notation> {
    return this.notationService.create(conversationKey, body.content, req.auth.userId);
  }

  @Patch(':conversationKey/notations/:notationId')
  @ApiOperation({ summary: 'Edit a notation — owner only, within 24 h of creation' })
  async update(@Param('conversationKey') conversationKey: string, @Param('notationId') notationId: string, @Body() body: { content: string }, @Req() req: AuthRequest): Promise<Notation> {
    return this.notationService.update(conversationKey, notationId, body.content, req.auth.userId);
  }

  @Delete(':conversationKey/notations/:notationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notation — owner only' })
  async delete(@Param('conversationKey') conversationKey: string, @Param('notationId') notationId: string, @Req() req: AuthRequest): Promise<void> {
    return this.notationService.delete(conversationKey, notationId, req.auth.userId);
  }
}
