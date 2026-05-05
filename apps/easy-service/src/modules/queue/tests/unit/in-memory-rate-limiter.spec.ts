import { InMemoryRateLimiter } from 'src/infra/queue/in-memory/in-memory-rate-limiter';

describe('InMemoryRateLimiter', (): void => {
  it('should allow up to limitPerMinute and then reject', async (): Promise<void> => {
    const limiter = new InMemoryRateLimiter();
    const sessionId = 'ws-1';

    const first = await limiter.consume(sessionId, 2);
    const second = await limiter.consume(sessionId, 2);
    const third = await limiter.consume(sessionId, 2);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });
});
