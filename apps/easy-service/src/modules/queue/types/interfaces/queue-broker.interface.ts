import type { QueueEventType } from '../enums/queue-event-type.enum';

export type QueueEventEnvelope<TPayload> = {
  eventId: string;
  type: QueueEventType;
  whatsappSessionId: string;
  workspaceId: string;
  payload: TPayload;
  createdAt: number;
  attempt: number;
  maxAttempts: number;
};

export type QueueHandler<TPayload> = (event: QueueEventEnvelope<TPayload>) => Promise<void>;

export interface QueueBroker {
  publish<TPayload>(event: Omit<QueueEventEnvelope<TPayload>, 'createdAt' | 'attempt'>): Promise<void>;
  subscribe<TPayload>(type: QueueEventType, handler: QueueHandler<TPayload>): void;
}
