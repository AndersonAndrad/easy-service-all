import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { QueueEventType } from '../../types/enums/queue-event-type.enum';
import type { QueueBroker, QueueEventEnvelope } from '../../types/interfaces/queue-broker.interface';
import type { RateLimiter } from '../../types/interfaces/rate-limiter.interface';
import { QUEUE_BROKER } from '../../types/tokens/queue-broker.token';
import { RATE_LIMITER } from '../../types/tokens/rate-limiter.token';

type MessageReceivedPayload = {
  messageId: string;
  remoteJid: string;
  messagePayload: Record<string, unknown>;
  rateLimitPerMinute: number;
};

type PersistMessagePayload = {
  messageId: string;
  remoteJid: string;
  messagePayload: Record<string, unknown>;
};

@Injectable()
export class MessageReceivedConsumer implements OnModuleInit {
  private readonly logger = new Logger(MessageReceivedConsumer.name);

  constructor(
    @Inject(QUEUE_BROKER) private readonly queueBroker: QueueBroker,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  onModuleInit(): void {
    this.queueBroker.subscribe<MessageReceivedPayload>(QueueEventType.MESSAGE_RECEIVED, async (event) => {
      const { whatsappSessionId, workspaceId, payload } = event as QueueEventEnvelope<MessageReceivedPayload>;

      const limit = payload.rateLimitPerMinute;
      const rate = await this.rateLimiter.consume(whatsappSessionId, limit);

      if (!rate.allowed) {
        this.logger.warn(`Rate limit exceeded for whatsappSessionId=${whatsappSessionId}. eventId=${event.eventId}`);
        return;
      }

      const persistEventId = `persist:${payload.messageId}`;

      await this.queueBroker.publish<PersistMessagePayload>({
        eventId: persistEventId,
        type: QueueEventType.PERSIST_MESSAGE,
        whatsappSessionId,
        workspaceId,
        payload: {
          messageId: payload.messageId,
          remoteJid: payload.remoteJid,
          messagePayload: payload.messagePayload,
        },
        maxAttempts: event.maxAttempts,
      });
    });
  }
}
