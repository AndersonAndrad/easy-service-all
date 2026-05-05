"use client";

import { Avatar } from "@/components/ui/avatar";
import type { Conversation } from "@/lib/chat-client";
import {
  conversationDisplayName,
  conversationIdentitySubtitle,
  formatMessageTime,
  minutesSinceLastMessage,
  sanitizeName,
  urgencyColorClass,
} from "@/lib/chat-client";
import { cn } from "@/lib/utils";

export type SortOrder = "newest" | "oldest";

type ConversationListHeaderProps = {
  search: string;
  onSearchChange: (v: string) => void;
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  onClose?: () => void;
};

export function ConversationListHeader({
  search,
  onSearchChange,
  sortOrder,
  onSortChange,
  onClose,
}: ConversationListHeaderProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-border px-3 pb-3 pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Atendimentos</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSortChange(sortOrder === "newest" ? "oldest" : "newest")}
            aria-label={sortOrder === "newest" ? "Ordenar: mais recente primeiro (clique para inverter)" : "Ordenar: mais antigo primeiro (clique para inverter)"}
            title={sortOrder === "newest" ? "Mais recente primeiro" : "Mais antigo primeiro"}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.625rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {sortOrder === "newest" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 4h13" /><path d="M3 8h9" /><path d="M3 12h5" />
                <path d="m15 8 3 3 3-3" /><path d="M18 11V19" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 12h5" /><path d="M3 8h9" /><path d="M3 4h13" />
                <path d="m15 16 3-3 3 3" /><path d="M18 13V5" />
              </svg>
            )}
            {sortOrder === "newest" ? "Recente" : "Antigo"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar lista"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
            </button>
          )}
        </div>
      </div>
      <div className="relative">
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
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          placeholder="Buscar atendimento..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        />
      </div>
    </div>
  );
}

type ConversationItemProps = {
  conversation: Conversation;
  isActive: boolean;
  workspaceColor?: string;
  onClick: () => void;
};

function getInitials(name: string): string {
  const clean = sanitizeName(name);
  return clean
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function ConversationItem({
  conversation,
  isActive,
  workspaceColor,
  onClick,
}: ConversationItemProps) {
  const displayName = conversationDisplayName(conversation);
  const identitySubtitle = conversationIdentitySubtitle(conversation);
  const lastTs = conversation.lastMessageAt ?? conversation.createdAt.getTime();
  const minutes = minutesSinceLastMessage(lastTs);
  const unread = conversation.unreadCount ?? 0;
  const borderColor = unread > 0 ? urgencyColorClass(minutes) : "border-l-transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-l-4 px-3 py-3 text-left transition-colors",
        borderColor,
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/50"
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        <Avatar
          className="size-9 border-2"
          style={workspaceColor ? { borderColor: workspaceColor } : undefined}
        >
          <span className="flex size-full items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(identitySubtitle ?? displayName)}
          </span>
        </Avatar>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[0.5625rem] font-bold leading-none text-destructive-foreground py-0.5">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className={cn("truncate text-sm leading-tight", unread > 0 ? "font-semibold" : "font-medium")}>
            {displayName}
          </span>
          <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
            {formatMessageTime(lastTs)}
          </span>
        </div>
        {identitySubtitle && (
          <p className="mt-0.5 flex min-w-0 items-center gap-1">
            <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Cliente
            </span>
            <span className="truncate text-xs text-muted-foreground">{identitySubtitle}</span>
          </p>
        )}
        <p className={cn("truncate text-xs", unread > 0 ? "font-medium text-foreground/70" : "text-muted-foreground")}>
          {conversation.lastMessagePreview ?? conversation.conversationKey}
        </p>
      </div>
    </button>
  );
}

type ConversationListProps = {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  workspaceColorMap?: Map<string, string>;
};

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading,
  onSelect,
  workspaceColorMap,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div
          className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Carregando atendimentos"
        />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
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
        <p className="text-sm text-muted-foreground">Nenhum atendimento encontrado</p>
      </div>
    );
  }

  return (
    <ul className="scroll-pretty flex-1 overflow-y-auto" role="list">
      {conversations.map((conv) => (
        <li key={conv._id}>
          <ConversationItem
            conversation={conv}
            isActive={conv._id === activeConversationId}
            workspaceColor={workspaceColorMap?.get(conv.workspaceId)}
            onClick={() => onSelect(conv._id)}
          />
        </li>
      ))}
    </ul>
  );
}
