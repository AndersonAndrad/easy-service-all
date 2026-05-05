"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Message, MessageStatus, MessageType } from "@/lib/chat-client";
import {
  formatFileSize,
  formatMessageTime,
  isMessageFromAttendant,
  participantDisplayName,
} from "@/lib/chat-client";
import { getPublicApiBaseUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

function getMessageText(message: Message): string {
  return message.payload.text ?? "";
}

function getMessageMedia(message: Message): Message["payload"]["media"] {
  return message.payload.media;
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

type MessageBubbleProps = {
  message: Message;
};

function AudioMessage({ url, duration }: { url: string; duration?: number }) {
  // Relative paths (e.g. /audio/file/…) are served by the backend — prepend its base URL.
  const src = useMemo(
    () => (url.startsWith("/") ? `${getPublicApiBaseUrl()}${url}` : url),
    [url],
  );
  return (
    <div className="flex items-center gap-2">
      <audio controls src={src} className="max-w-[200px]">
        <track kind="captions" />
      </audio>
      {duration != null && (
        <span className="text-xs text-muted-foreground">{duration}s</span>
      )}
    </div>
  );
}

function AudioSentPlaceholder() {
  return (
    <div className="flex items-center gap-1.5 text-xs opacity-80">
      <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
      <span>Áudio</span>
    </div>
  );
}

function FileMessage({ url, size }: { url: string; size: number }) {
  const filename = url.split("/").pop() ?? "arquivo";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm hover:bg-background/80 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <div className="min-w-0">
        <p className="truncate font-medium">{filename}</p>
        {size > 0 && (
          <p className="text-xs text-muted-foreground">{formatFileSize(size)}</p>
        )}
      </div>
    </a>
  );
}

function ImageMessage({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt="Imagem"
        className="max-h-48 max-w-[240px] rounded-md object-cover"
        loading="lazy"
      />
    </a>
  );
}

function MessageContent({ message }: { message: Message }) {
  const { type } = message;
  const text = getMessageText(message);
  const media = getMessageMedia(message);

  if (type === "audio") {
    if (media?.url) return <AudioMessage url={media.url} duration={media.duration} />;
    return <AudioSentPlaceholder />;
  }
  if (type === "file" && media?.url) {
    return <FileMessage url={media.url} size={media.size} />;
  }
  if (type === "image" && media?.url) {
    return <ImageMessage url={media.url} />;
  }
  if (!text.trim() && !media?.url) {
    return (
      <p className="text-sm text-muted-foreground">Sem conteúdo para exibir</p>
    );
  }
  return (
    <p className="whitespace-pre-wrap break-words text-sm">{text}</p>
  );
}

function MessageStatusIcon({
  status,
  isAgent,
}: {
  status: MessageStatus | undefined;
  isAgent: boolean;
}) {
  if (!status) return null;

  if (status === "read") {
    return (
      <svg
        width={16}
        height={9}
        viewBox="0 0 22 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "inline-block shrink-0",
          isAgent ? "text-primary-foreground" : "text-primary"
        )}
        aria-label="Lida"
      >
        <polyline points="1 6 5 10 12 3" />
        <polyline points="8 6 12 10 19 3" />
      </svg>
    );
  }

  return (
    <svg
      width={10}
      height={9}
      viewBox="0 0 14 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "inline-block shrink-0",
        isAgent ? "text-primary-foreground/50" : "text-muted-foreground/70"
      )}
      aria-label="Enviada"
    >
      <polyline points="2 6 5 10 12 3" />
    </svg>
  );
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = isMessageFromAttendant(message);
  const senderName = isAgent
    ? participantDisplayName(message.attendant)
    : participantDisplayName(message.client);

  return (
    <div className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 pb-2 pt-2",
          isAgent
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {senderName && (
          <p
            className={cn(
              "mb-1 text-[0.6rem] font-semibold leading-none",
              isAgent ? "text-right text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {senderName}
          </p>
        )}
        <MessageContent message={message} />
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[0.625rem]",
            isAgent ? "justify-end text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          <span>{formatMessageTime(message.createdAt.getTime())}</span>
          {!isAgent && (
            <MessageStatusIcon status={message.status} isAgent={isAgent} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ timestamp }: { timestamp: number }) {
  const date = new Date(timestamp);
  const label = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[0.6875rem] text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
}

// ─── Message List ─────────────────────────────────────────────────────────────

type MessageListProps = {
  messages: Message[];
  isLoading: boolean;
};

function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Carregando mensagens"
        />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={32}
          height={32}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
          aria-hidden
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-sm text-muted-foreground">Nenhuma mensagem</p>
      </div>
    );
  }

  return (
    <div className="scroll-pretty flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
      {messages.map((msg, idx) => {
        const prev = messages[idx - 1];
        const showDate =
          !prev || !isSameDay(prev.createdAt.getTime(), msg.createdAt.getTime());
        return (
          <div key={msg._id}>
            {showDate && <DateSeparator timestamp={msg.createdAt.getTime()} />}
            <MessageBubble message={msg} />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Message Input ────────────────────────────────────────────────────────────

const MAX_AUDIO_SECONDS = 60;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

type RecordingState = "idle" | "recording" | "sending";

type MessageInputProps = {
  onSend: (type: MessageType, content: string, file?: File) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  disabled?: boolean;
};

function useAudioRecorder(onSendAudio: ((blob: Blob) => Promise<void>) | undefined) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobEvent["data"][]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setElapsed(0);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "";

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      mr.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        chunksRef.current = [];
        if (onSendAudio && blob.size > 0) {
          setRecordingState("sending");
          try {
            await onSendAudio(blob);
          } finally {
            setRecordingState("idle");
            setElapsed(0);
          }
        } else {
          setRecordingState("idle");
          setElapsed(0);
        }
      };

      mr.start(250);
      setRecordingState("recording");
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          if (next >= MAX_AUDIO_SECONDS) {
            mr.stop(); // triggers onstop which sends automatically
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          }
          return next;
        });
      }, 1000);
    } catch {
      setRecordingState("idle");
    }
  }, [onSendAudio, stopStream]);

  const stopAndSend = useCallback(() => {
    stopTimer();
    mediaRecorderRef.current?.stop();
  }, [stopTimer]);

  const cancel = useCallback(() => {
    stopTimer();
    stopStream();
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    setRecordingState("idle");
    setElapsed(0);
  }, [stopTimer, stopStream]);

  useEffect(() => () => { stopTimer(); stopStream(); }, [stopTimer, stopStream]);

  return { recordingState, elapsed, startRecording, stopAndSend, cancel };
}

function RecordButton({ state, elapsed, onStart, onStop, onCancel, disabled }: {
  state: RecordingState;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (state === "sending") {
    return (
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <div className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Enviando…</span>
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="mb-1 flex items-center gap-1.5">
        <span className="size-2 animate-pulse rounded-full bg-destructive" />
        <span className="text-xs tabular-nums text-destructive">{mm}:{ss}</span>
        <button
          type="button"
          aria-label="Enviar áudio"
          onClick={onStop}
          className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Cancelar gravação"
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Gravar áudio"
      disabled={disabled}
      onClick={onStart}
      className="mb-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    </button>
  );
}

function MessageInput({ onSend, onSendAudio, disabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { recordingState, elapsed, startRecording, stopAndSend, cancel } = useAudioRecorder(onSendAudio);

  const canSend = !disabled && !sending && text.trim().length > 0;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSend("text", text.trim());
      setText("");
      textareaRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setError("Arquivo excede o limite de 15 MB.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const type: MessageType = ALLOWED_IMAGE_TYPES.includes(file.type) ? "image" : "file";
      await onSend(type, file.name, file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar arquivo.");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const isRecording = recordingState !== "idle";

  return (
    <div className="border-t border-border bg-background px-3 pb-3 pt-2">
      {error && (
        <p className="mb-2 text-xs text-destructive">{error}</p>
      )}
      <div className="flex items-end gap-2">
        {/* Attachment — hidden while recording */}
        {!isRecording && (
          <>
            <button
              type="button"
              aria-label="Anexar arquivo"
              disabled={disabled || sending}
              onClick={() => fileInputRef.current?.click()}
              className="mb-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.47" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(e) => void handleFileChange(e)}
            />
          </>
        )}

        {/* Audio recorder button / recorder controls */}
        {onSendAudio && (
          <RecordButton
            state={recordingState}
            elapsed={elapsed}
            onStart={() => void startRecording()}
            onStop={stopAndSend}
            onCancel={cancel}
            disabled={disabled || sending}
          />
        )}

        {/* Text area — hidden while recording */}
        {!isRecording && (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem... (Enter para enviar)"
            disabled={disabled || sending}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
            style={{ maxHeight: "8rem", overflowY: "auto" }}
          />
        )}

        {/* Send text button — hidden while recording */}
        {!isRecording && (
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={!canSend}
            aria-label="Enviar mensagem"
            className="mb-0.5 shrink-0"
          >
            {sending ? (
              <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
          </Button>
        )}
      </div>
      {!isRecording && (
        <p className="mt-1 text-[0.625rem] text-muted-foreground">
          Áudio: máx. 1 min · Arquivo: máx. 15 MB · Shift+Enter para nova linha
        </p>
      )}
    </div>
  );
}

// ─── Conversation Header ──────────────────────────────────────────────────────

type ConversationHeaderProps = {
  clientName: string;
  onToggleDetails: () => void;
  showDetails: boolean;
  onCloseConversation?: () => void;
};

export function ConversationHeader({
  clientName,
  onToggleDetails,
  showDetails,
  onCloseConversation,
}: ConversationHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{clientName}</h2>
        <p className="text-xs text-muted-foreground">Atendimento</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onCloseConversation && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Encerrar atendimento"
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                Encerrar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar atendimento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja encerrar este atendimento? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onCloseConversation}>
                  Encerrar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <button
          type="button"
          onClick={onToggleDetails}
          aria-label={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
          className={cn(
            "rounded-md p-2 transition-colors hover:bg-muted",
            showDetails && "bg-muted"
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Message View ─────────────────────────────────────────────────────────────

type MessageViewProps = {
  messages: Message[];
  isLoadingMessages: boolean;
  clientName: string;
  onSend: (type: MessageType, content: string, file?: File) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  onToggleDetails: () => void;
  showDetails: boolean;
  onCloseConversation?: () => void;
};

export function MessageView({
  messages,
  isLoadingMessages,
  clientName,
  onSend,
  onSendAudio,
  onToggleDetails,
  showDetails,
  onCloseConversation,
}: MessageViewProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ConversationHeader
        clientName={clientName}
        onToggleDetails={onToggleDetails}
        showDetails={showDetails}
        onCloseConversation={onCloseConversation}
      />
      <MessageList messages={messages} isLoading={isLoadingMessages} />
      <MessageInput onSend={onSend} onSendAudio={onSendAudio} />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function ChatEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={48}
        height={48}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground/50"
        aria-hidden
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Selecione um atendimento</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Escolha uma conversa na lista para começar
        </p>
      </div>
    </div>
  );
}
