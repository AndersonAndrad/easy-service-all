import { QueueEventType } from '../../types/enums/queue-event-type.enum';
import type { QueueBroker, QueueEventEnvelope } from '../../types/interfaces/queue-broker.interface';
import type { RateLimiter } from '../../types/interfaces/rate-limiter.interface';
import { MessageReceivedConsumer } from '../../app/consumers/message-received.consumer';

describe('MessageReceivedConsumer', (): void => {
  it('should not publish PERSIST_MESSAGE when rate limit is exceeded', async (): Promise<void> => {
    const publish = jest.fn(async (): Promise<void> => {});

    let handler: ((event: QueueEventEnvelope<unknown>) => Promise<void>) | null = null;
    const queueBroker = {
      subscribe: jest.fn((type: QueueEventType, cb: (event: QueueEventEnvelope<unknown>) => Promise<void>) => {
        if (type === QueueEventType.MESSAGE_RECEIVED) handler = cb;
      }),
      publish,
    } as unknown as QueueBroker;

    const rateLimiter: RateLimiter = {
      consume: jest.fn(
        async (): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => ({
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + 60_000,
        }),
      ),
    };

    const consumer = new MessageReceivedConsumer(queueBroker, rateLimiter);
    consumer.onModuleInit();

    expect(handler).not.toBeNull();

    const event: QueueEventEnvelope<{
      messageId: string;
      remoteJid: string;
      messagePayload: { text: string };
      rateLimitPerMinute: number;
    }> = {
      eventId: 'evt-1',
      type: QueueEventType.MESSAGE_RECEIVED,
      whatsappSessionId: 'ws-1',
      workspaceId: 'w-1',
      payload: {
        messageId: 'm-1',
        remoteJid: 'jid-1',
        messagePayload: { text: 'hi' },
        rateLimitPerMinute: 1,
      },
      createdAt: Date.now(),
      attempt: 1,
      maxAttempts: 3,
    };

    await handler?.(event);

    expect(publish).not.toHaveBeenCalled();
  });

  it('should publish PERSIST_MESSAGE when rate limit allows', async (): Promise<void> => {
    const publish = jest.fn(async (): Promise<void> => {});

    let handler: ((event: QueueEventEnvelope<unknown>) => Promise<void>) | null = null;
    const queueBroker = {
      subscribe: jest.fn((type: QueueEventType, cb: (event: QueueEventEnvelope<unknown>) => Promise<void>) => {
        if (type === QueueEventType.MESSAGE_RECEIVED) handler = cb;
      }),
      publish,
    } as unknown as QueueBroker;

    const rateLimiter: RateLimiter = {
      consume: jest.fn(
        async (): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => ({
          allowed: true,
          remaining: 0,
          resetAt: Date.now() + 60_000,
        }),
      ),
    };

    const consumer = new MessageReceivedConsumer(queueBroker, rateLimiter);
    consumer.onModuleInit();

    const event: QueueEventEnvelope<{
      messageId: string;
      remoteJid: string;
      messagePayload: { text: string };
      rateLimitPerMinute: number;
    }> = {
      eventId: 'evt-2',
      type: QueueEventType.MESSAGE_RECEIVED,
      whatsappSessionId: 'ws-2',
      workspaceId: 'w-2',
      payload: {
        messageId: 'm-2',
        remoteJid: 'jid-2',
        messagePayload: { text: 'hello' },
        rateLimitPerMinute: 60,
      },
      createdAt: Date.now(),
      attempt: 1,
      maxAttempts: 3,
    };

    await handler?.(event);

    expect(publish).toHaveBeenCalledTimes(1);
    const published = publish.mock.calls[0][0];
    expect(published.type).toBe(QueueEventType.PERSIST_MESSAGE);
    expect(published.eventId).toBe('persist:m-2');
  });
});
