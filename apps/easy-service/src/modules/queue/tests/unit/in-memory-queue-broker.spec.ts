import { QueueEventType } from '../../types/enums/queue-event-type.enum';
import type { QueueBroker, QueueHandler } from '../../types/interfaces/queue-broker.interface';
import { InMemoryQueueBroker } from 'src/infra/queue/in-memory/in-memory-queue-broker';
import { InMemoryQueueIdempotencyRepository } from 'src/infra/queue/in-memory/in-memory-queue-idempotency.repository';

describe('InMemoryQueueBroker', (): void => {
  it('should retry on handler failure up to maxAttempts', async (): Promise<void> => {
    const idempotencyRepo = new InMemoryQueueIdempotencyRepository();
    const broker: QueueBroker = new InMemoryQueueBroker(idempotencyRepo);

    let calls = 0;

    broker.subscribe(QueueEventType.RECONNECT_SESSION, async (): Promise<void> => {
      calls += 1;
      if (calls < 2) throw new Error('temporary failure');
    });

    await broker.publish({
      eventId: 'evt-1',
      type: QueueEventType.RECONNECT_SESSION,
      whatsappSessionId: 'wsess-1',
      workspaceId: 'w-1',
      payload: {},
      maxAttempts: 2,
    });

    expect(calls).toBe(2);
  });

  it('should avoid duplicate processing for the same eventId', async (): Promise<void> => {
    const idempotencyRepo = new InMemoryQueueIdempotencyRepository();
    const broker: QueueBroker = new InMemoryQueueBroker(idempotencyRepo);

    const handler = jest.fn(async (): Promise<void> => {});

    broker.subscribe(QueueEventType.MESSAGE_RECEIVED, handler as unknown as QueueHandler<unknown>);

    await broker.publish({
      eventId: 'evt-dup',
      type: QueueEventType.MESSAGE_RECEIVED,
      whatsappSessionId: 'wsess-2',
      workspaceId: 'w-2',
      payload: { messageId: 'm-1' },
      maxAttempts: 1,
    });

    await broker.publish({
      eventId: 'evt-dup',
      type: QueueEventType.MESSAGE_RECEIVED,
      whatsappSessionId: 'wsess-2',
      workspaceId: 'w-2',
      payload: { messageId: 'm-1' },
      maxAttempts: 1,
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
