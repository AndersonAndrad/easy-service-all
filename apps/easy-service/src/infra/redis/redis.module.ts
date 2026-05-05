import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './app/redis.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
        const port = Number(configService.get<number>('REDIS_PORT') ?? 6379);
        const password = configService.get<string>('REDIS_PASSWORD');

        return new Redis({
          host,
          port,
          password,
        });
      },
    },
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
