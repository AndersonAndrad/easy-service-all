import { Module } from '@nestjs/common';

import { InMemoryQueueBroker } from 'src/infra/queue/in-memory/in-memory-queue-broker';
import { InMemoryQueueIdempotencyRepository } from 'src/infra/queue/in-memory/in-memory-queue-idempotency.repository';
import { InMemoryRateLimiter } from 'src/infra/queue/in-memory/in-memory-rate-limiter';

import { BaileysModule } from '../baileys/baileys.module';
import { MessageReceivedConsumer } from './app/consumers/message-received.consumer';
import { PersistMessageConsumer } from './app/consumers/persist-message.consumer';
import { QUEUE_IDEMPOTENCY_REPOSITORY } from './types/repository/queue-idempotency.repository';
import { QUEUE_BROKER } from './types/tokens/queue-broker.token';
import { RATE_LIMITER } from './types/tokens/rate-limiter.token';

@Module({
  imports: [BaileysModule],
  providers: [
    InMemoryQueueIdempotencyRepository,
    {
      provide: QUEUE_IDEMPOTENCY_REPOSITORY,
      useExisting: InMemoryQueueIdempotencyRepository,
    },
    InMemoryQueueBroker,
    MessageReceivedConsumer,
    PersistMessageConsumer,
    {
      provide: RATE_LIMITER,
      useClass: InMemoryRateLimiter,
    },
    {
      provide: QUEUE_BROKER,
      useExisting: InMemoryQueueBroker,
    },
  ],
  exports: [InMemoryQueueBroker, QUEUE_BROKER],
})
export class QueueModule {}
