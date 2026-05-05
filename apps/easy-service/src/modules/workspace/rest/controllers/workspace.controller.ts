import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaileysService } from 'src/modules/baileys/app/baileys.service';

import type { PaginatedResponse } from 'src/common/interface/paginated.interface';
import { Roles } from 'src/shared/enums/roles.enum';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesAllowed } from 'src/shared/guards/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { WorkspaceService } from '../../app/workspace.service';
import { CreateWorkspaceDto } from '../../types/dto/create-workspace.dto';
import { FindWorkspacesQueryDto } from '../../types/dto/find-workspaces-query.dto';
import { UpdateWorkspaceDto } from '../../types/dto/update-workspace.dto';
import type { Workspace } from '../../types/interfaces/workspace.interface';
import { presentWorkspace } from '../presenters/workspace.presenter';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workspaces')
export class WorkspaceController {
  private readonly logger = new Logger(WorkspaceController.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly baileysService: BaileysService,
  ) {}

  @Post()
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateWorkspaceDto): Promise<Workspace> {
    const workspace = await this.workspaceService.create(dto);
    void this.baileysService.registerWorkspaceConnection(workspace.id).catch((error: unknown): void => {
      this.logger.error(`failed to start connection listener for workspace ${workspace.id}`, error instanceof Error ? error.stack : String(error));
    });
    return presentWorkspace(workspace);
  }

  @Get()
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Find workspaces (paginated)' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async find(@Query() query: FindWorkspacesQueryDto): Promise<PaginatedResponse<Workspace>> {
    return this.workspaceService.find(query);
  }

  @Patch(':id')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a workspace' })
  async update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto): Promise<Workspace> {
    const updated = await this.workspaceService.update(id, dto);
    return presentWorkspace(updated);
  }

  @Delete(':id')
  @RolesAllowed(Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a workspace' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.workspaceService.delete(id);
  }

  @Get(':id')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get workspace by id' })
  @ApiParam({ name: 'id', required: true })
  async findById(@Param('id') id: string): Promise<Workspace> {
    const workspace = await this.workspaceService.findById(id);
    return presentWorkspace(workspace);
  }
}
