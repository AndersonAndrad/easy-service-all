import { Global, Module } from '@nestjs/common';
import { JwtService } from './app/jwt.service';
import { JwtCleanupService } from './app/jwt.cleanup.service';
import { RedisModule } from 'src/infra/redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [JwtService, JwtCleanupService],
  exports: [JwtService],
})
export class JwtModule {}
