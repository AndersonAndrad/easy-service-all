import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspacePersistenceModule } from 'src/modules/workspace/workspace-persistence.module';
import { CurrentAuthContextProvider } from 'src/shared/guards/current-auth-context.provider';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { WorkspaceAccessGuard } from 'src/shared/guards/workspace-access.guard';
import { ContractsService } from './app/contracts.service';
import { PdfService } from './pdf/pdf.service';
import { ContractsController } from './rest/controllers/contracts.controller';

@Module({
  imports: [WorkspacePersistenceModule],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    PdfService,
    CurrentAuthContextProvider,
    JwtAuthGuard,
    RolesGuard,
    WorkspaceAccessGuard,
    Reflector,
  ],
})
export class ContractsModule {}
