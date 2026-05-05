import { Injectable } from '@nestjs/common';

import type { QueueIdempotencyRepository } from 'src/modules/queue/types/repository/queue-idempotency.repository';

@Injectable()
export class InMemoryQueueIdempotencyRepository implements QueueIdempotencyRepository {
  private readonly processed = new Set<string>();

  async isProcessed(eventId: string): Promise<boolean> {
    return this.processed.has(eventId);
  }

  async markProcessed(eventId: string): Promise<void> {
    this.processed.add(eventId);
  }
}
