import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { MessageService } from 'src/modules/baileys/app/message.service';
import { QueueEventType } from '../../types/enums/queue-event-type.enum';
import type { QueueBroker, QueueEventEnvelope } from '../../types/interfaces/queue-broker.interface';
import { QUEUE_BROKER } from '../../types/tokens/queue-broker.token';

type PersistMessagePayload = {
  messageId: string;
  remoteJid: string;
  messagePayload: Record<string, unknown>;
};

const PLACEHOLDER_CONVERSATION_KEY = '';

function normalizeParticipantId(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function clientFromRemoteJid(remoteJid: string): string {
  const local = remoteJid.split('@')[0] ?? remoteJid;
  return normalizeParticipantId(local);
}

function readString(record: Record<string, unknown>, key: string): string {
  const v = record[key];
  return typeof v === 'string' ? v : '';
}

@Injectable()
export class PersistMessageConsumer implements OnModuleInit {
  private readonly logger = new Logger(PersistMessageConsumer.name);

  constructor(
    @Inject(QUEUE_BROKER) private readonly queueBroker: QueueBroker,
    private readonly messageService: MessageService,
  ) {}

  onModuleInit(): void {
    this.queueBroker.subscribe<PersistMessagePayload>(QueueEventType.PERSIST_MESSAGE, async (event) => {
      const { payload } = event as QueueEventEnvelope<PersistMessagePayload>;
      const mp = payload.messagePayload;

      const attendantPhone = normalizeParticipantId(readString(mp, 'attendantPhone'));
      if (!attendantPhone) {
        this.logger.warn(`Persist skipped: missing attendantPhone in messagePayload. messageId=${payload.messageId}`);
        return;
      }

      const clientPhone = clientFromRemoteJid(payload.remoteJid);
      if (!clientPhone) {
        this.logger.warn(`Persist skipped: could not derive client from remoteJid. messageId=${payload.messageId}`);
        return;
      }

      const text = readString(mp, 'text');
      const attendantName = readString(mp, 'attendantName').trim() || attendantPhone;
      const clientNameRaw = readString(mp, 'clientName').trim() || readString(mp, 'pushName').trim() || clientPhone;

      // await this.messageService.create({
      //   conversationKey: PLACEHOLDER_CONVERSATION_KEY,
      //   type: MessageType.text,
      //   payload: { text },
      //   attendant: { phone: attendantPhone, name: attendantName },
      //   client: { phone: clientPhone, name: clientNameRaw },
      // });

      this.logger.verbose(`Persisted message via conversation module. messageId=${payload.messageId}`);

      const { workspaceId } = event as QueueEventEnvelope<PersistMessagePayload>;
      // await this.chatInboxService.handleIncoming(workspaceId, clientPhone, text, clientNameRaw || undefined);
      this.logger.verbose(`Persisted message via chat module. messageId=${payload.messageId}`);
    });
  }
}
