import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from 'src/shared/enums/roles.enum';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesAllowed } from 'src/shared/guards/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { WorkspaceAccessGuard } from 'src/shared/guards/workspace-access.guard';
import { ContractsService } from '../../app/contracts.service';
import { MaternityContractDto } from '../../types/dto/maternity-contract.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
@Controller('workspaces/:workspaceId/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('maternity')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a maternity contract PDF' })
  @ApiParam({ name: 'workspaceId', required: true })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async generateMaternity(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: MaternityContractDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.contractsService.generateMaternityContract(dto, workspaceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="maternity-contract.pdf"');
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }
}
