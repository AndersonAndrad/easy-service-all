import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MongooseContactRepository } from 'src/infra/database/mongodb/repository/mongoose-contact.repository';
import { WorkspacePersistenceModule } from 'src/modules/workspace/workspace-persistence.module';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { CurrentAuthContextProvider } from 'src/shared/guards/current-auth-context.provider';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { ContactService } from './app/contact.service';
import { ContactController } from './rest/controllers/contact.controller';
import { CONTACT_REPOSITORY } from './types/repository/contact.repository';

@Module({
  imports: [WorkspacePersistenceModule],
  controllers: [ContactController],
  providers: [
    ContactService,
    CurrentAuthContextProvider,
    JwtAuthGuard,
    RolesGuard,
    Reflector,
    { provide: CONTACT_REPOSITORY, useClass: MongooseContactRepository },
  ],
  exports: [ContactService],
})
export class ContactModule {}
