import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { PaginatedResponse } from 'src/common/interface/paginated.interface';
import { Roles } from 'src/shared/enums/roles.enum';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesAllowed } from 'src/shared/guards/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { WorkspaceAccessGuard } from 'src/shared/guards/workspace-access.guard';
import { ContactService } from '../../app/contact.service';
import { CreateContactDto } from '../../types/dto/create-contact.dto';
import { FindContactsQueryDto } from '../../types/dto/find-contacts-query.dto';
import { ImportContactDto } from '../../types/dto/import-contact.dto';
import { UpdateContactDto } from '../../types/dto/update-contact.dto';
import type { Contact } from '../../types/interface/contact.interface';
import { presentContact } from '../presenters/contact.presenter';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
@Controller('workspaces/:workspaceId/contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a contact in a workspace' })
  @ApiParam({ name: 'workspaceId', required: true })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateContactDto): Promise<Contact> {
    const contact = await this.contactService.create(workspaceId, dto);
    return presentContact(contact);
  }

  @Get()
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'List contacts in a workspace (paginated)' })
  @ApiParam({ name: 'workspaceId', required: true })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async find(@Param('workspaceId') workspaceId: string, @Query() query: FindContactsQueryDto): Promise<PaginatedResponse<Contact>> {
    return this.contactService.find(workspaceId, query);
  }

  @Get(':id')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a contact by id' })
  @ApiParam({ name: 'workspaceId', required: true })
  @ApiParam({ name: 'id', required: true })
  async findById(@Param('workspaceId') workspaceId: string, @Param('id') id: string): Promise<Contact> {
    const contact = await this.contactService.findById(id, workspaceId);
    return presentContact(contact);
  }

  @Patch(':id')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'workspaceId', required: true })
  @ApiParam({ name: 'id', required: true })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.contactService.update(id, workspaceId, dto);
    return presentContact(contact);
  }

  @Delete(':id')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiParam({ name: 'workspaceId', required: true })
  @ApiParam({ name: 'id', required: true })
  async delete(@Param('workspaceId') workspaceId: string, @Param('id') id: string): Promise<void> {
    await this.contactService.delete(id, workspaceId);
  }

  @Post('import')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Import a contact from another workspace by contact ID',
    description: 'The contact owner shares the contact ID. You use it here to copy the contact into your workspace.',
  })
  @ApiParam({ name: 'workspaceId', required: true })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async importContact(@Param('workspaceId') workspaceId: string, @Body() dto: ImportContactDto): Promise<Contact> {
    const contact = await this.contactService.importContact(dto.contactId, workspaceId);
    return presentContact(contact);
  }
}
