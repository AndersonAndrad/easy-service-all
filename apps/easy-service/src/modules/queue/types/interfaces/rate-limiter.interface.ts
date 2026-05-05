export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export interface RateLimiter {
  consume(whatsappSessionId: string, limitPerMinute: number): Promise<RateLimitResult>;
}
