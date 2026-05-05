export interface WhatsappMessage {
  workspaceId?: string;
  whatsappSessionId?: string;
  sendBy?: string;
  key: WhatsappMessageKey;
  messageTimestamp: number;
  pushName: string;
  broadcast: boolean;
  message: WhatsappMessageContent;
}

export interface WhatsappMessageKey {
  remoteJid: string;
  remoteJidAlt?: string;
  fromMe: boolean;
  id: string;
  participant?: string;
  participantAlt?: string;
  addressingMode: string;
}

export interface WhatsappMessageContent {
  conversation?: string;
  extendedTextMessage?: { text: string; contextInfo?: { mentionedJid?: string[] } };
  messageContextInfo?: WhatsappMessageContextInfo;
}

export interface WhatsappMessageContextInfo {
  messageSecret: string;
}
