import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from 'src/infra/redis/app/redis.service';
import { BlackListEntry, OnlineSessionEntry, RefreshSessionEntry } from '../types/interface/jwt.interface';

@Injectable()
export class JwtCleanupService {
  constructor(private readonly redisService: RedisService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup(): Promise<void> {
    const now = Date.now();

    const [blackListKeys, onlineSessionKeys, refreshSessionKeys] = await Promise.all([this.redisService.keys('black-list:*'), this.redisService.keys('online-session:*'), this.redisService.keys('refresh-session:*')]);

    await Promise.all([this.cleanupBlackList(blackListKeys, now), this.cleanupOnlineSessions(onlineSessionKeys, now), this.cleanupRefreshSessions(refreshSessionKeys, now)]);
  }

  private async cleanupBlackList(keys: string[], now: number): Promise<void> {
    const deletions: Promise<void>[] = [];

    for (const key of keys) {
      deletions.push(
        (async () => {
          const entry = await this.redisService.getJson<BlackListEntry>(key);
          if (entry && entry.expiresAt <= now) {
            await this.redisService.delete(key);
          }
        })(),
      );
    }

    await Promise.all(deletions);
  }

  private async cleanupOnlineSessions(keys: string[], now: number): Promise<void> {
    const deletions: Promise<void>[] = [];

    for (const key of keys) {
      deletions.push(
        (async () => {
          const entry = await this.redisService.getJson<OnlineSessionEntry>(key);
          if (entry && entry.expiresAt <= now) {
            await this.redisService.delete(key);
          }
        })(),
      );
    }

    await Promise.all(deletions);
  }

  private async cleanupRefreshSessions(keys: string[], now: number): Promise<void> {
    const deletions: Promise<void>[] = [];

    for (const key of keys) {
      deletions.push(
        (async () => {
          const entry = await this.redisService.getJson<RefreshSessionEntry>(key);
          if (entry && entry.expiresAt <= now) {
            await this.redisService.delete(key);
          }
        })(),
      );
    }

    await Promise.all(deletions);
  }
}
