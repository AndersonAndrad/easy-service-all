export const QUEUE_IDEMPOTENCY_REPOSITORY = Symbol('QUEUE_IDEMPOTENCY_REPOSITORY');

export interface QueueIdempotencyRepository {
  isProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}
