import { isAxiosError } from "axios";

import { parseErrorMessage } from "@/lib/auth-client";
import { publicApiClient } from "@/lib/http/public-api-client";
import {
  authConfig,
  normalizePhoneDigits,
  parseCreatedAt,
  pickId,
  pickNum,
  pickStr,
  sanitizeName,
  toTitleCase,
} from "@easy-service/shared";
import type {
  Client,
  Conversation,
  ConversationParticipant,
  ConversationType,
  Message,
  MessageStatus,
  MessageType,
  Notation,
  SendMessageBody,
  SenderType,
} from "@easy-service/shared";

export type {
  Client,
  Conversation,
  ConversationParticipant,
  ConversationType,
  Message,
  MessageStatus,
  MessageType,
  Notation,
  SendMessageBody,
  SenderType,
};

function pickMessageId(o: Record<string, unknown>): string {
  for (const k of [
    "_id",
    "id",
    "messageId",
    "message_id",
    "uuid",
    "key",
    "sid",
    "messageSid",
  ]) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (v && typeof v === "object" && "$oid" in (v as Record<string, unknown>)) {
      const oid = (v as Record<string, unknown>).$oid;
      if (typeof oid === "string" && oid.length > 0) return oid;
    }
  }
  return "";
}

function parseParticipant(raw: unknown): ConversationParticipant {
  if (!raw || typeof raw !== "object") {
    return { name: "", phone: "" };
  }
  const p = raw as Record<string, unknown>;
  const name = pickStr(p, ["name"]);
  const phone = pickStr(p, ["phone"]);
  const custom = pickStr(p, ["customName", "custom_name"]);
  return {
    name,
    phone,
    ...(custom ? { customName: custom } : {}),
  };
}

function normalizeNotation(raw: unknown): Notation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = pickStr(o, ["id", "_id"]);
  if (!id) return null;

  const parseDate = (key: string): Date => {
    const v = o[key];
    if (typeof v === "string" && v.length > 0) return new Date(v);
    if (typeof v === "number" && Number.isFinite(v)) return new Date(v);
    return new Date();
  };

  return {
    id,
    content: pickStr(o, ["content"]),
    ownerId: pickStr(o, ["ownerId", "owner_id"]),
    createdAt: parseDate("createdAt") ?? parseDate("created_at"),
    updatedAt: parseDate("updatedAt") ?? parseDate("updated_at"),
  };
}

function normalizeConversation(raw: unknown): Conversation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const _id = pickId(o);
  if (!_id) return null;

  // Attendant — top-level field
  const attendant = parseParticipant(o.attendant);

  // Participants — array; fall back to old { attendant, client } shape
  let participants: ConversationParticipant[] = [];
  if (Array.isArray(o.participants)) {
    participants = (o.participants as unknown[]).map(parseParticipant);
  } else if (o.participants && typeof o.participants === "object") {
    const p = o.participants as Record<string, unknown>;
    const client = parseParticipant(p.client);
    if (client.phone || client.name) participants = [client];
  } else if (o.client) {
    const client = parseParticipant(o.client);
    if (client.phone || client.name) participants = [client];
  }

  const typeRaw = pickStr(o, ["type"], "direct");
  const type: ConversationType = typeRaw === "group" ? "group" : "direct";

  const conversationKey = pickStr(o, ["conversationKey", "conversation_key"], _id);
  const groupJid = pickStr(o, ["groupJid", "group_jid"]) || undefined;
  const groupName = pickStr(o, ["groupName", "group_name"]) || undefined;
  const chatName = pickStr(o, ["chatName", "chat_name"]) || undefined;
  const lastMessageAt = pickNum(o, ["lastMessageAt", "last_message_at"]) || undefined;
  const unreadCount = pickNum(o, ["unreadCount", "unread_count"]) || undefined;

  // Last message preview — string field or nested object with text/payload
  let lastMessagePreview: string | undefined;
  const lm = o.lastMessage ?? o.lastMessagePreview ?? o.lastMessageText;
  if (typeof lm === "string" && lm.trim()) {
    lastMessagePreview = lm.trim();
  } else if (lm && typeof lm === "object") {
    const lmObj = lm as Record<string, unknown>;
    const text =
      typeof lmObj.text === "string" ? lmObj.text :
      typeof lmObj.content === "string" ? lmObj.content :
      lmObj.payload && typeof lmObj.payload === "object"
        ? (lmObj.payload as Record<string, unknown>).text as string | undefined
        : undefined;
    if (text?.trim()) lastMessagePreview = text.trim();
  }
  const notations = (Array.isArray(o.notations) ? o.notations : [])
    .map(normalizeNotation)
    .filter((n): n is Notation => n !== null);

  return {
    _id,
    createdAt: parseCreatedAt(o),
    conversationKey,
    workspaceId: pickStr(o, ["workspaceId", "workspace_id"]),
    whatsappSessionId: pickStr(o, ["whatsappSessionId", "whatsapp_session_id"]),
    type,
    attendant,
    participants,
    notations,
    ...(groupJid ? { groupJid } : {}),
    ...(groupName ? { groupName } : {}),
    ...(chatName ? { chatName } : {}),
    ...(lastMessageAt ? { lastMessageAt } : {}),
    ...(unreadCount ? { unreadCount } : {}),
    ...(lastMessagePreview ? { lastMessagePreview } : {}),
  };
}

function normalizeMediaFromUnknown(raw: unknown): Message["payload"]["media"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const m = raw as Record<string, unknown>;
  const url = pickStr(m, ["url"]);
  if (!url) return undefined;
  return {
    url,
    size: pickNum(m, ["size"], 0),
    duration:
      typeof m.duration === "number" && Number.isFinite(m.duration)
        ? m.duration
        : undefined,
  };
}

function normalizeMessagePayload(
  rawPayload: unknown,
  flat: Record<string, unknown>
): Message["payload"] {
  const textFromFlat = pickStr(flat, ["content", "text", "body"]) || undefined;

  if (typeof rawPayload === "string") {
    const trimmed = rawPayload.trim();
    const out: Message["payload"] = {};
    if (trimmed) out.text = trimmed;
    return out;
  }

  if (rawPayload === undefined || rawPayload === null) {
    const media = normalizeMediaFromUnknown(flat.media);
    const out: Message["payload"] = {};
    if (textFromFlat) out.text = textFromFlat;
    if (media) out.media = media;
    return out;
  }

  if (typeof rawPayload !== "object") {
    const out: Message["payload"] = {};
    if (textFromFlat) out.text = textFromFlat;
    return out;
  }

  const p = rawPayload as Record<string, unknown>;
  const textRaw =
    typeof p.text === "string"
      ? p.text
      : typeof p.content === "string"
        ? p.content
        : typeof p.body === "string"
          ? p.body
          : pickStr(p, ["text", "content", "body"]) || undefined;
  const text = textRaw ?? textFromFlat;
  const media =
    normalizeMediaFromUnknown(p.media) ?? normalizeMediaFromUnknown(flat.media);

  const out: Message["payload"] = {};
  if (text) out.text = text;
  if (media) out.media = media;
  return out;
}

function unwrapMessageRow(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const inner = o.message ?? o.record ?? o.entity ?? o.item;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner;
  }
  return raw;
}

function normalizeMessage(raw: unknown, fallbackIndex?: number): Message | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  let _id = pickMessageId(o);
  if (!_id && fallbackIndex !== undefined) {
    _id = `message-${fallbackIndex}`;
  }
  if (!_id) return null;

  let attendant = parseParticipant(o.attendant);
  let client = parseParticipant(o.client);
  const participantsRaw = o.participants;
  if (participantsRaw && typeof participantsRaw === "object") {
    const p = participantsRaw as Record<string, unknown>;
    if (!attendant.phone && !attendant.name) {
      attendant = parseParticipant(p.attendant);
    }
    if (!client.phone && !client.name) {
      client = parseParticipant(p.client);
    }
  }

  const conversationKey = pickStr(
    o,
    ["conversationKey", "conversation_key", "conversationId", "conversation_id"],
    ""
  );

  const payload = normalizeMessagePayload(o.payload, o);

  const sendByRaw = pickStr(o, ["sendBy", "send_by", "sentBy", "sent_by"]);
  const sendBy = sendByRaw || undefined;

  const statusRaw = pickStr(o, ["status"]);
  const status: MessageStatus | undefined =
    statusRaw === "sent" || statusRaw === "send"
      ? "sent"
      : statusRaw === "read"
        ? "read"
        : undefined;

  return {
    _id,
    createdAt: parseCreatedAt(o),
    conversationKey,
    workspaceId: pickStr(o, ["workspaceId", "workspace_id"]),
    whatsappSessionId: pickStr(o, ["whatsappSessionId", "whatsapp_session_id"]),
    ...(sendBy ? { sendBy } : {}),
    ...(status ? { status } : {}),
    payload,
    type: pickStr(o, ["type"], "text") as MessageType,
    attendant,
    client,
  };
}

export function parseChatMessage(raw: unknown): Message | null {
  return normalizeMessage(raw);
}

export function parseChatConversation(raw: unknown): Conversation | null {
  return normalizeConversation(raw);
}

export { sanitizeJid, sanitizeName, toTitleCase, normalizePhoneDigits } from "@easy-service/shared";

export function participantDisplayName(p: ConversationParticipant): string {
  const base = p.customName?.trim() || p.name?.trim() || p.phone?.trim() || "";
  return sanitizeName(base) || "—";
}

function phonesMatchForSender(a: string, b: string): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  if (da.length >= db.length && da.endsWith(db)) return true;
  if (db.length >= da.length && db.endsWith(da)) return true;
  return false;
}

export function isMessageFromAttendant(message: Message): boolean {
  const sendBy = message.sendBy?.trim();
  if (!sendBy) return false;
  return phonesMatchForSender(sendBy, message.attendant.phone);
}

/** Returns the non-attendant participant for a direct conversation. */
export function conversationClient(conv: Conversation): ConversationParticipant | undefined {
  if (conv.type === "group") return undefined;
  return (
    conv.participants.find((p) => p.phone !== conv.attendant.phone) ??
    conv.participants[0]
  );
}

/** Human-readable display name for a conversation. */
export function conversationDisplayName(conv: Conversation): string {
  if (conv.chatName?.trim()) return sanitizeName(conv.chatName.trim());
  if (conv.type === "group") {
    return sanitizeName(conv.groupName?.trim() || "") || "Grupo";
  }
  const first = conv.participants[0];
  return first ? participantDisplayName(first) : "—";
}

/**
 * Secondary identity label shown under the primary display name.
 * When chatName overrides the name, this reveals the underlying client/group identity.
 */
export function conversationIdentitySubtitle(conv: Conversation): string | undefined {
  if (!conv.chatName?.trim()) return undefined;
  if (conv.type === "group") {
    const g = sanitizeName(conv.groupName?.trim() || "");
    return g || undefined;
  }
  const client = conv.participants.find((p) => p.phone !== conv.attendant.phone) ?? conv.participants[0];
  return client ? participantDisplayName(client) : undefined;
}

export function mergeConversationIntoMessages(
  messages: Message[],
  conversation: Conversation | undefined
): Message[] {
  if (!conversation) return messages;
  const attendant = conversation.attendant;
  const client = conversationClient(conversation);
  return messages.map((m) => ({
    ...m,
    attendant:
      m.attendant.phone.trim() || m.attendant.name.trim() ? m.attendant : attendant,
    client:
      client && !(m.client.phone.trim() || m.client.name.trim()) ? client : m.client,
  }));
}


function normalizeClient(raw: unknown): Client | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const _id = pickId(o);
  if (!_id) return null;

  return {
    _id,
    workspaceId: pickStr(o, ["workspaceId", "workspace_id"]),
    name: pickStr(o, ["name"]) || undefined,
    phone: pickStr(o, ["phone"]),
    document: pickStr(o, ["document"]) || undefined,
    createdAt: pickNum(o, ["createdAt", "created_at"]),
  };
}

function extractRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data as unknown[];
  const topKeys = [
    "items",
    "data",
    "results",
    "conversations",
    "messages",
    "annotations",
    "payload",
    "rows",
    "list",
    "records",
    "content",
    "body",
    "result",
    "values",
  ] as const;
  for (const k of topKeys) {
    if (Array.isArray(o[k])) return o[k] as unknown[];
  }
  const nested = o.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    if (Array.isArray(inner.data)) return inner.data as unknown[];
    const innerKeys = [
      "items",
      "data",
      "results",
      "messages",
      "list",
      "rows",
      "records",
      "content",
    ] as const;
    for (const k of innerKeys) {
      if (Array.isArray(inner[k])) return inner[k] as unknown[];
    }
  }
  for (const v of Object.values(o)) {
    if (Array.isArray(v) && v.length > 0 && v.every((x) => x != null && typeof x === "object")) {
      return v;
    }
  }
  return [];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function listConversations(
  accessToken: string,
  workspaceId: string
): Promise<Conversation[]> {
  try {
    const res = await publicApiClient.get<unknown>("/conversations/by-workspace", {
      ...authConfig(accessToken),
      params: { workspaceId },
    });
    return extractRows(res.data)
      .map(normalizeConversation)
      .filter((c): c is Conversation => c !== null);
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function listMessages(accessToken: string, conversationId: string, cursor?: string): Promise<Message[]> {
  try {
    const res = await publicApiClient.get<unknown>(`/messages/conversations/${encodeURIComponent(conversationId)}`,
      {
        ...authConfig(accessToken),
        params: cursor ? { cursor } : undefined,
      }
    );
    return extractRows(res.data)
      .map(unwrapMessageRow)
      .map((row, i) => normalizeMessage(row, i))
      .filter((m): m is Message => m !== null);
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function sendMessage(
  accessToken: string,
  body: SendMessageBody
): Promise<Message> {
  try {
    const res = await publicApiClient.post<unknown>("/messages/send", body, authConfig(accessToken));
    const raw =
      res.data !== null && typeof res.data === "object" && "data" in (res.data as Record<string, unknown>)
        ? (res.data as Record<string, unknown>).data
        : res.data;
    const msg = normalizeMessage(raw);
    if (!msg) throw new Error("Resposta inválida ao enviar mensagem.");
    return msg;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function getClient(
  accessToken: string,
  clientId: string
): Promise<Client | null> {
  try {
    const res = await publicApiClient.get<unknown>(
      `/clients/${encodeURIComponent(clientId)}`,
      authConfig(accessToken)
    );
    const raw =
      res.data !== null && typeof res.data === "object" && "data" in (res.data as Record<string, unknown>)
        ? (res.data as Record<string, unknown>).data
        : res.data;
    return normalizeClient(raw);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw new Error(await parseErrorMessage(error));
  }
}

export async function createNotation(
  accessToken: string,
  conversationKey: string,
  content: string
): Promise<Notation> {
  try {
    const res = await publicApiClient.post<unknown>(
      `/conversations/${encodeURIComponent(conversationKey)}/notations`,
      { content },
      authConfig(accessToken)
    );
    const raw =
      res.data !== null && typeof res.data === "object" && "data" in (res.data as Record<string, unknown>)
        ? (res.data as Record<string, unknown>).data
        : res.data;
    const notation = normalizeNotation(raw);
    if (!notation) throw new Error("Resposta inválida ao criar notação.");
    return notation;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function updateNotation(
  accessToken: string,
  conversationKey: string,
  notationId: string,
  content: string
): Promise<Notation> {
  try {
    const res = await publicApiClient.patch<unknown>(
      `/conversations/${encodeURIComponent(conversationKey)}/notations/${encodeURIComponent(notationId)}`,
      { content },
      authConfig(accessToken)
    );
    const raw =
      res.data !== null && typeof res.data === "object" && "data" in (res.data as Record<string, unknown>)
        ? (res.data as Record<string, unknown>).data
        : res.data;
    const notation = normalizeNotation(raw);
    if (!notation) throw new Error("Resposta inválida ao atualizar notação.");
    return notation;
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function deleteNotation(
  accessToken: string,
  conversationKey: string,
  notationId: string
): Promise<void> {
  try {
    await publicApiClient.delete(
      `/conversations/${encodeURIComponent(conversationKey)}/notations/${encodeURIComponent(notationId)}`,
      authConfig(accessToken)
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function closeConversation(
  accessToken: string,
  conversationId: string
): Promise<void> {
  try {
    await publicApiClient.patch(
      `/conversations/${encodeURIComponent(conversationId)}/close`,
      {},
      authConfig(accessToken)
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function updateClientCustomName(
  accessToken: string,
  conversationKey: string,
  customName: string
): Promise<void> {
  try {
    await publicApiClient.patch(
      `/conversations/${encodeURIComponent(conversationKey)}/client-name`,
      { customName },
      authConfig(accessToken)
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

export async function updateConversationChatName(
  accessToken: string,
  conversationKey: string,
  chatName: string
): Promise<void> {
  try {
    await publicApiClient.patch(
      `/conversations/${encodeURIComponent(conversationKey)}/chat-name`,
      { chatName },
      authConfig(accessToken)
    );
  } catch (error) {
    throw new Error(await parseErrorMessage(error));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns minutes since lastMessageAt. Returns null if lastMessageAt is 0. */
export function minutesSinceLastMessage(lastMessageAt: number): number | null {
  if (!lastMessageAt) return null;
  return Math.floor((Date.now() - lastMessageAt) / 60_000);
}

/** Returns the response-time urgency color class based on minutes elapsed. */
export function urgencyColorClass(minutes: number | null): string {
  if (minutes === null) return "border-l-transparent";
  if (minutes > 10) return "border-l-red-500";
  if (minutes > 5) return "border-l-orange-500";
  return "border-l-amber-300";
}

/** Format a timestamp (ms) as a short time or date string. */
export function formatMessageTime(ts: number): string {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Format bytes into human-readable string. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
