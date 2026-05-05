import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from './infra/auth/jwt/jwt.module';
import { MongoDbModule } from './infra/database/mongodb/mongodb.module';
import { AuthModule } from './modules/auth/auth.module';
import { BaileysModule } from './modules/baileys/baileys.module';
import { ContactModule } from './modules/contact/contact.module';
import { QueueModule } from './modules/queue/queue.module';
import { SocketModule } from './modules/socket/socket.module';
import { UserModule } from './modules/user/user.module';
import { WhatsappSessionModule } from './modules/whatsapp-session/whatsapp-session.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MongoDbModule, SocketModule, BaileysModule, UserModule, AuthModule, QueueModule, WorkspaceModule, WhatsappSessionModule, ContactModule, ScheduleModule.forRoot(), JwtModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
