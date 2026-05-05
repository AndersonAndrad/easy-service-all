import { Module } from '@nestjs/common';
import { USER_REPOSITORY, MongooseUserRepository } from 'src/infra/database/mongodb/repository/mongoose-user.repository';
import { UserService } from './app/user.service';
import { UserController } from './rest/user.controller';

@Module({
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY,
      useClass: MongooseUserRepository,
    },
  ],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
