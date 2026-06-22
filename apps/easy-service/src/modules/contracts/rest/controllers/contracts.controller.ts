import { Body, Controller, HttpCode, HttpStatus, Post, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from 'src/shared/enums/roles.enum';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesAllowed } from 'src/shared/guards/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { ContractsService } from '../../app/contracts.service';
import { MaternityContractDto } from '../../types/dto/maternity-contract.dto';
import { MaternityMarcelloContractDto } from '../../types/dto/maternity-marcello-contract.dto';
import { ResidenceDeclarationContractDto } from '../../types/dto/residence-declaration-contract.dto';
import { AccidentAssistanceFormDto } from '../../types/dto/accident-assistance-form.dto';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('maternity')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a maternity contract PDF' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async generateMaternity(@Body() dto: MaternityContractDto, @Res() res: Response): Promise<void> {
    const pdf = await this.contractsService.generateMaternityContract(dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="maternity-contract.pdf"');
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }

  @Post('maternity-we-core')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a WE CORE maternity contract PDF' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async generateMaternityWeCore(@Body() dto: MaternityContractDto, @Res() res: Response): Promise<void> {
    const pdf = await this.contractsService.generateWeCoreMaternityContract(dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="maternity-we-core-contract.pdf"');
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }

  @Post('maternity-marcello')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a Marcello Renault maternity contract PDF',
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async generateMaternityMarcello(@Body() dto: MaternityMarcelloContractDto, @Res() res: Response): Promise<void> {
    const pdf = await this.contractsService.generateMarcelloMaternityContract(dto);
    const encodedFilename = encodeURIComponent(`contrato e procuração - ${dto.fullName}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }

  @Post('residence-declaration')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a residence declaration PDF' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async generateResidenceDeclaration(@Body() dto: ResidenceDeclarationContractDto, @Res() res: Response): Promise<void> {
    const pdf = await this.contractsService.generateResidenceDeclarationContract(dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="residence-declaration.pdf"');
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }

  @Post('accident-assistance-form')
  @RolesAllowed(Roles.ADMIN, Roles.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate an accident assistance form PDF' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async generateAccidentAssistanceForm(@Body() dto: AccidentAssistanceFormDto, @Res() res: Response): Promise<void> {
    const pdf = await this.contractsService.generateAccidentAssistanceForm(dto);
    const encodedFilename = encodeURIComponent(`ficha_auxilio_acidente_${dto.fullName}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
  }
}
