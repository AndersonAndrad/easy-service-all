import { Injectable } from '@nestjs/common';

import type { RateLimiter, RateLimitResult } from 'src/modules/queue/types/interfaces/rate-limiter.interface';

type Bucket = {
  windowStartMs: number;
  count: number;
};

@Injectable()
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  async consume(whatsappSessionId: string, limitPerMinute: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = 60_000;

    const current = this.buckets.get(whatsappSessionId);
    if (!current) {
      this.buckets.set(whatsappSessionId, { windowStartMs: now, count: 1 });
      return { allowed: true, remaining: Math.max(limitPerMinute - 1, 0), resetAt: now + windowMs };
    }

    const elapsed = now - current.windowStartMs;
    if (elapsed >= windowMs) {
      this.buckets.set(whatsappSessionId, { windowStartMs: now, count: 1 });
      return { allowed: true, remaining: Math.max(limitPerMinute - 1, 0), resetAt: now + windowMs };
    }

    if (current.count >= limitPerMinute) {
      return { allowed: false, remaining: 0, resetAt: current.windowStartMs + windowMs };
    }

    current.count += 1;
    this.buckets.set(whatsappSessionId, current);

    return { allowed: true, remaining: Math.max(limitPerMinute - current.count, 0), resetAt: current.windowStartMs + windowMs };
  }
}
