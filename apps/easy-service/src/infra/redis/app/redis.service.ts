import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async setJson<T>(key: string, value: T, ttlMilliseconds?: number): Promise<void> {
    const payload = JSON.stringify(value);

    if (ttlMilliseconds && ttlMilliseconds > 0) {
      await this.client.psetex(key, ttlMilliseconds, payload);
      return;
    }

    await this.client.set(key, payload);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
