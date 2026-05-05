import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

import { QueueEventType } from 'src/modules/queue/types/enums/queue-event-type.enum';
import type { QueueBroker, QueueEventEnvelope, QueueHandler } from 'src/modules/queue/types/interfaces/queue-broker.interface';
import { QUEUE_IDEMPOTENCY_REPOSITORY, type QueueIdempotencyRepository } from 'src/modules/queue/types/repository/queue-idempotency.repository';

type HandlerRecord = {
  handler: QueueHandler<unknown>;
};

@Injectable()
export class InMemoryQueueBroker implements QueueBroker {
  private readonly logger = new Logger(InMemoryQueueBroker.name);
  private readonly handlers = new Map<QueueEventType, HandlerRecord>();

  constructor(@Inject(QUEUE_IDEMPOTENCY_REPOSITORY) private readonly idempotencyRepository: QueueIdempotencyRepository) {}

  subscribe<TPayload>(type: QueueEventType, handler: QueueHandler<TPayload>): void {
    this.handlers.set(type, { handler: handler as QueueHandler<unknown> });
  }

  async publish<TPayload>(event: Omit<QueueEventEnvelope<TPayload>, 'createdAt' | 'attempt'>): Promise<void> {
    const record = this.handlers.get(event.type);
    if (!record) {
      this.logger.warn(`No queue handler registered for type ${event.type}`);
      return;
    }

    const envelope: QueueEventEnvelope<TPayload> = {
      ...event,
      createdAt: Date.now(),
      attempt: 1,
    };

    await this.processWithRetry(event, envelope, record.handler);
  }

  private async processWithRetry<TPayload>(original: Omit<QueueEventEnvelope<TPayload>, 'createdAt' | 'attempt'>, envelope: QueueEventEnvelope<TPayload>, handler: QueueHandler<unknown>): Promise<void> {
    const maxAttempts = envelope.maxAttempts;

    for (let attempt = envelope.attempt; attempt <= maxAttempts; attempt += 1) {
      try {
        const processed = await this.idempotencyRepository.isProcessed(original.eventId);
        if (processed) return;

        await handler(envelope as QueueEventEnvelope<unknown>);

        await this.idempotencyRepository.markProcessed(original.eventId);
        return;
      } catch (caught: unknown) {
        if (attempt >= maxAttempts) {
          this.logger.error(`Queue event failed after ${attempt} attempts. type=${original.type} eventId=${original.eventId}`, caught instanceof Error ? caught.stack : undefined);
          throw new InternalServerErrorException('Queue event failed after maximum retry attempts');
        }
      }
    }
  }
}
