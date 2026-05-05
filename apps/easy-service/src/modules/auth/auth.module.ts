import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from 'src/infra/auth/jwt/jwt.module';
import { SocketModule } from 'src/modules/socket/socket.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthService } from './app/auth.service';
import { AuthController } from './rest/auth.controller';

@Module({
  imports: [UserModule, ConfigModule, JwtModule, SocketModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
