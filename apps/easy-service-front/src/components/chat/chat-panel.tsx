"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "@/components/toast/toaster";
import { useAuth } from "@/contexts/auth-context";
import { useSessionSocket } from "@/contexts/session-socket-context";
import type {
  Client,
  Conversation,
  Message,
  MessageType,
  Notation,
} from "@/lib/chat-client";
import {
  closeConversation,
  conversationClient,
  conversationDisplayName,
  createNotation,
  deleteNotation,
  isMessageFromAttendant,
  listConversations,
  listMessages,
  mergeConversationIntoMessages,
  minutesSinceLastMessage,
  updateNotation,
  updateClientCustomName,
  updateConversationChatName,
} from "@/lib/chat-client";
import { uploadAudioBlob } from "@/lib/audio-upload-client";
import { createContact } from "@/lib/contact-client";
import type { Workspace } from "@/lib/workspace-client";
import { listWorkspaces } from "@/lib/workspace-client";
import { cn } from "@/lib/utils";
import { useConversationSocket, type MessageStatusUpdate } from "@/hooks/use-conversation-socket";
import { useWorkspaceRooms } from "@/hooks/use-workspace-rooms";

import {
  ConversationList,
  ConversationListHeader,
  type SortOrder,
} from "./conversation-list";
import { DetailsPanel } from "./details-panel";
import { ChatEmptyState, MessageView } from "./message-view";

// ─── Workspace Selector ───────────────────────────────────────────────────────

const ALL_WORKSPACES = "__all__";

type WorkspaceSelectorProps = {
  workspaces: Workspace[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
};

function WorkspaceSelector({
  workspaces,
  selectedId,
  isLoading,
  onSelect,
}: WorkspaceSelectorProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Workspace:</span>
      {isLoading ? (
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : workspaces.length === 0 ? (
        <span className="text-xs text-muted-foreground">Nenhum workspace</span>
      ) : (
        <select
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
        >
          {!selectedId && <option value="">Selecionar…</option>}
          {workspaces.length > 1 && (
            <option value={ALL_WORKSPACES}>Todos os workspaces</option>
          )}
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function matchesActiveConversation(
  msg: Message,
  activeId: string | null,
  active: Conversation | undefined
): boolean {
  if (!activeId || !active) return false;
  if (msg.conversationKey === active.conversationKey) return true;
  if (msg.conversationKey === activeId) return true;
  return false;
}

export function ChatPanel() {
  const { user, accessToken } = useAuth();
  const { isRealtimeReady, socket } = useSessionSocket();

  // ── Workspaces ──
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const workspacesRef = useRef<Workspace[]>([]);
  workspacesRef.current = workspaces;
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // ── Conversations ──
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // ── Messages ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);


  // ── UI ──
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [showDetails, setShowDetails] = useState(false);
  const [showList, setShowList] = useState(true);
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);

  const currentUserId = user?.sub ?? "";

  // ── Load workspaces ──
  useEffect(() => {
    if (!accessToken) return;
    setIsLoadingWorkspaces(true);
    listWorkspaces(accessToken, {
      page: 1,
      pageSize: 100,
      search: "",
      ownerId: user?.sub,
    })
      .then(({ items }) => {
        setWorkspaces(items);
        if (items.length === 1 && items[0]) {
          setSelectedWorkspaceId(items[0].id);
        } else if (items.length > 1) {
          setSelectedWorkspaceId(ALL_WORKSPACES);
        }
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar workspaces.");
      })
      .finally(() => setIsLoadingWorkspaces(false));
  }, [accessToken, user?.sub]);

  // ── Join workspace room(s) via socket ──
  const socketWorkspaceIds = useMemo(
    () =>
      selectedWorkspaceId === ALL_WORKSPACES
        ? workspaces.map((ws) => ws.id)
        : selectedWorkspaceId
          ? [selectedWorkspaceId]
          : [],
    [selectedWorkspaceId, workspaces]
  );
  useWorkspaceRooms(socketWorkspaceIds);

  // ── Load conversations when workspace selection changes ──
  useEffect(() => {
    if (!accessToken || !selectedWorkspaceId) {
      setConversations([]);
      setActiveConversationId(null);
      return;
    }
    setIsLoadingConversations(true);
    setActiveConversationId(null);
    setMessages([]);

    const load: Promise<Conversation[]> =
      selectedWorkspaceId === ALL_WORKSPACES
        ? Promise.allSettled(
            workspacesRef.current.map((ws) => listConversations(accessToken, ws.id))
          ).then((results) => {
            const seen = new Set<string>();
            return results
              .filter(
                (r): r is PromiseFulfilledResult<Conversation[]> =>
                  r.status === "fulfilled"
              )
              .flatMap((r) => r.value)
              .filter((c) => {
                if (seen.has(c._id)) return false;
                seen.add(c._id);
                return true;
              });
          })
        : listConversations(accessToken, selectedWorkspaceId);

    load
      .then(setConversations)
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar atendimentos.");
      })
      .finally(() => setIsLoadingConversations(false));
  // workspaces intentionally omitted — read via workspacesRef to avoid
  // resetting conversations when the workspace list re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedWorkspaceId]);

  // ── Open conversation ──
  const openConversation = useCallback(
    (conversationId: string) => {
      if (!accessToken) return;

      setActiveConversationId(conversationId);
      setIsMobileListOpen(false);

      // Load messages (many backends key the route by conversationKey; state uses _id)
      setIsLoadingMessages(true);
      setMessages([]);
      const convForList = conversations.find((c) => c._id === conversationId);
      const listMessagesParam =
        convForList?.conversationKey?.trim() || conversationId;
      listMessages(accessToken, listMessagesParam)
        .then((rows) => {
          const conv = conversations.find((c) => c._id === conversationId);
          const merged = mergeConversationIntoMessages(rows, conv);
          // Mark all messages as read locally immediately
          setMessages(merged.map((m) => ({ ...m, status: "read" as const })));
          // Reset unread badge + backfill last message preview
          const lastMsg = merged[merged.length - 1];
          const preview = lastMsg?.payload.text?.trim() || undefined;
          setConversations((prev) =>
            prev.map((c) =>
              c._id === conversationId
                ? { ...c, unreadCount: 0, ...(preview ? { lastMessagePreview: preview } : {}) }
                : c
            )
          );
          // Notify backend for messages that weren't already read
          if (socket && isRealtimeReady && conv) {
            for (const msg of merged) {
              if (msg.status !== "read") {
                socket.emit("read-message", {
                  conversationKey: conv.conversationKey,
                  messageId: msg._id,
                });
              }
            }
          }
        })
        .catch((e: unknown) => {
          toast.error(e instanceof Error ? e.message : "Erro ao carregar mensagens.");
        })
        .finally(() => setIsLoadingMessages(false));
    },
    [accessToken, conversations, socket, isRealtimeReady]
  );

  // ── Send message ──
  const handleSend = useCallback(
    async (_type: MessageType, content: string) => {
      if (!socket || !isRealtimeReady || !activeConversationId) return;
      const conv = conversations.find((c) => c._id === activeConversationId);
      if (!conv) return;

      // Show optimistic bubble immediately
      const tempId = `temp-${Date.now()}`;
      const client = conversationClient(conv) ?? { name: "", phone: "" };
      const optimistic: Message = {
        _id: tempId,
        createdAt: new Date(),
        conversationKey: conv.conversationKey,
        workspaceId: conv.workspaceId,
        whatsappSessionId: conv.whatsappSessionId,
        sendBy: conv.attendant.phone,
        status: "sent",
        payload: { text: content },
        type: "text",
        attendant: conv.attendant,
        client,
      };
      setMessages((prev) => [...prev, optimistic]);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversationId ? { ...c, lastMessagePreview: content } : c
        )
      );

      socket.emit("send_message", {
        conversationKey: conv.conversationKey,
        workspaceId: conv.workspaceId,
        type: "text",
        payload: { text: content },
      });
    },
    [socket, isRealtimeReady, activeConversationId, conversations]
  );

  // ── Send audio ──
  const handleSendAudio = useCallback(
    async (blob: Blob) => {
      if (!accessToken || !activeConversationId) return;
      const conv = conversations.find((c) => c._id === activeConversationId);
      if (!conv) return;

      const tempId = `temp-audio-${Date.now()}`;
      const client = conversationClient(conv) ?? { name: "", phone: "" };
      const optimistic: Message = {
        _id: tempId,
        createdAt: new Date(),
        conversationKey: conv.conversationKey,
        workspaceId: conv.workspaceId,
        whatsappSessionId: conv.whatsappSessionId,
        sendBy: conv.attendant.phone,
        status: "sent",
        payload: { text: "" },
        type: "audio",
        attendant: conv.attendant,
        client,
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        await uploadAudioBlob(accessToken, blob, conv.conversationKey, conv.workspaceId);
        // The backend emits new_message via socket which replaces the temp bubble
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erro ao enviar áudio.");
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    },
    [accessToken, activeConversationId, conversations]
  );

  // ── Close conversation ──
  const handleCloseConversation = useCallback(async () => {
    if (!accessToken || !activeConversationId) return;
    try {
      await closeConversation(accessToken, activeConversationId);
      setConversations((prev) => prev.filter((c) => c._id !== activeConversationId));
      setActiveConversationId(null);
      setMessages([]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao encerrar atendimento.");
    }
  }, [accessToken, activeConversationId]);

  // ── Rename client ──
  const handleRenameClient = useCallback(
    async (name: string) => {
      if (!accessToken || !activeConversationId) return;
      const conv = conversations.find((c) => c._id === activeConversationId);
      if (!conv) return;
      await updateClientCustomName(accessToken, conv.conversationKey, name);
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id !== activeConversationId) return c;
          const client = conversationClient(c);
          return {
            ...c,
            participants: c.participants.map((p) =>
              p.phone === client?.phone ? { ...p, customName: name } : p
            ),
          };
        })
      );
      setMessages((prev) =>
        prev.map((m) => ({ ...m, client: { ...m.client, customName: name } }))
      );
    },
    [accessToken, activeConversationId, conversations]
  );

  // ── Rename chat name ──
  const handleRenameChatName = useCallback(
    async (chatName: string) => {
      if (!accessToken || !activeConversationId) return;
      const conv = conversations.find((c) => c._id === activeConversationId);
      if (!conv) return;
      await updateConversationChatName(accessToken, conv.conversationKey, chatName);
      setConversations((prev) =>
        prev.map((c) => (c._id === activeConversationId ? { ...c, chatName } : c))
      );
    },
    [accessToken, activeConversationId, conversations]
  );

  // ── Socket: real-time events ──
  useConversationSocket(activeConversationId, {
    onNewMessage: useCallback(
      (msg: Message) => {
        const msgTs = msg.createdAt.getTime();
        const active = conversations.find((c) => c._id === activeConversationId);

        // If this conversation isn't in the list yet, fetch it and add it
        const known = conversations.some((c) => c.conversationKey === msg.conversationKey);
        if (!known && accessToken && msg.workspaceId) {
          listConversations(accessToken, msg.workspaceId)
            .then((fetched) => {
              setConversations((prev) => {
                const existingIds = new Set(prev.map((c) => c._id));
                const incoming = fetched.filter((c) => !existingIds.has(c._id));
                return incoming.length > 0 ? [...prev, ...incoming] : prev;
              });
            })
            .catch(() => { /* silently ignore fetch errors */ });
        }

        if (matchesActiveConversation(msg, activeConversationId, active)) {
          const merged = mergeConversationIntoMessages([msg], active)[0] ?? msg;
          const fromAttendant = isMessageFromAttendant(merged);
          // Client messages are marked read immediately; attendant echoes keep their status
          const final = fromAttendant ? merged : { ...merged, status: "read" as const };

          setMessages((prev) => {
            // Replace the optimistic temp bubble when the server echoes our own message.
            // Normalize empty string and undefined as equal so audio messages (text="")
            // match server echoes where text may be undefined.
            const normText = (t: string | undefined) => t?.trim() || "";
            const withoutTemp = fromAttendant
              ? prev.filter(
                  (m) =>
                    !(
                      m._id.startsWith("temp-") &&
                      m.type === final.type &&
                      m.conversationKey === final.conversationKey &&
                      normText(m.payload.text) === normText(final.payload.text)
                    )
                )
              : prev;
            if (withoutTemp.some((m) => m._id === final._id)) return withoutTemp;
            return [...withoutTemp, final];
          });

          // Only emit read-message for client messages, not our own echo
          if (!fromAttendant && socket && isRealtimeReady && active) {
            socket.emit("read-message", {
              conversationKey: active.conversationKey,
              messageId: msg._id,
            });
          }
        }

        // Keep lastMessageAt and preview current
        const preview = msg.payload.text?.trim() || undefined;
        setConversations((prev) =>
          prev.map((c) =>
            c.conversationKey === msg.conversationKey
              ? { ...c, lastMessageAt: msgTs, ...(preview ? { lastMessagePreview: preview } : {}) }
              : c
          )
        );
      },
      [accessToken, activeConversationId, conversations, socket, isRealtimeReady]
    ),
    onUpdateConversation: useCallback((updated: Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c))
      );
    }, []),
    onUnreadCountUpdated: useCallback(
      ({ conversationId, unreadCount }: { conversationId: string; unreadCount: number }) => {
        setConversations((prev) =>
          prev.map((c) => (c._id === conversationId ? { ...c, unreadCount } : c))
        );
      },
      []
    ),
    onMessageStatusUpdate: useCallback(
      ({ messageId, status }: MessageStatusUpdate) => {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, status } : m))
        );
      },
      []
    ),
  });

  // ── Notation handlers ──
  const handleCreateNotation = useCallback(
    async (content: string) => {
      if (!accessToken || !activeConversationId) return;
      const conv = conversations.find((c) => c._id === activeConversationId);
      if (!conv) return;
      const notation = await createNotation(accessToken, conv.conversationKey, content);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversationId
            ? { ...c, notations: [...c.notations, notation] }
            : c
        )
      );
    },
    [accessToken, activeConversationId, conversations]
  );

  const handleUpdateNotation = useCallback(
    async (id: string, content: string) => {
      if (!accessToken || !activeConversationId) return;
      const conv = conversations.find((c) => c._id === activeConversationId);
      if (!conv) return;
      const updated = await updateNotation(accessToken, conv.conversationKey, id, content);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversationId
            ? { ...c, notations: c.notations.map((n) => (n.id === id ? updated : n)) }
            : c
        )
      );
    },
    [accessToken, activeConversationId, conversations]
  );

  const handleDeleteNotation = useCallback(
    async (id: string) => {
      if (!accessToken || !activeConversationId) return;
      const conv = conversations.find((c) => c._id === activeConversationId);
      if (!conv) return;
      await deleteNotation(accessToken, conv.conversationKey, id);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversationId
            ? { ...c, notations: c.notations.filter((n) => n.id !== id) }
            : c
        )
      );
    },
    [accessToken, activeConversationId, conversations]
  );

  // ── Save client as contact ──
  const handleSaveAsContact = useCallback(
    async (workspaceId: string, phone: string, name?: string) => {
      if (!accessToken) return;
      await createContact(accessToken, {
        workspaceId,
        phone,
        ...(name ? { name } : {}),
      });
      toast.success("Contato salvo com sucesso.");
    },
    [accessToken]
  );

  // ── Workspace color map ──
  const workspaceColorMap = useMemo(
    () => new Map(workspaces.map((ws) => [ws.id, ws.customInterface.color])),
    [workspaces]
  );

  // ── Filtered conversations ──
  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const label = conversationDisplayName(c).toLowerCase();
        const key = (c.conversationKey ?? "").toLowerCase();
        const groupName = (c.groupName ?? "").toLowerCase();
        const participantsMatch = c.participants.some((p) => {
          const pName = (p.customName ?? p.name ?? "").toLowerCase();
          const pPhone = (p.phone ?? "").toLowerCase();
          return pName.includes(q) || pPhone.includes(q);
        });
        return label.includes(q) || key.includes(q) || groupName.includes(q) || participantsMatch;
      });
    }

    const ts = (c: typeof result[number]) => c.lastMessageAt ?? c.createdAt.getTime();
    return [...result].sort((a, b) =>
      sortOrder === "newest" ? ts(b) - ts(a) : ts(a) - ts(b)
    );
  }, [conversations, searchQuery, sortOrder]);

  const activeConversation = conversations.find((c) => c._id === activeConversationId);

  const activeClient = useMemo((): Client | null => {
    if (!activeConversation) return null;
    const c = conversationClient(activeConversation);
    if (!c) return null;
    return {
      _id: "",
      workspaceId: activeConversation.workspaceId,
      name: c.customName?.trim() || c.name?.trim() || undefined,
      phone: c.phone,
      document: undefined,
      createdAt: 0,
    };
  }, [activeConversation]);

  const activeClientName = activeConversation
    ? conversationDisplayName(activeConversation)
    : "Atendimento";

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Conversation list ── */}
      <aside
        className={cn(
          "flex w-[28%] min-w-[260px] shrink-0 flex-col border-r border-border bg-background",
          // Mobile: full-screen overlay when open
          "fixed inset-y-0 left-0 z-20 pt-14 md:static md:z-auto md:pt-0",
          isMobileListOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          // Desktop: hide when showList is false
          !showList && "md:hidden",
          "transition-transform duration-200"
        )}
      >
        <WorkspaceSelector
          workspaces={workspaces}
          selectedId={selectedWorkspaceId}
          isLoading={isLoadingWorkspaces}
          onSelect={setSelectedWorkspaceId}
        />
        <ConversationListHeader
          search={searchQuery}
          onSearchChange={setSearchQuery}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          onClose={() => setShowList(false)}
        />
        <ConversationList
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          isLoading={isLoadingConversations}
          onSelect={openConversation}
          workspaceColorMap={workspaceColorMap}
        />
      </aside>

      {/* Desktop: collapsed list — small avatars with urgency borders */}
      {!showList && (
        <div className="hidden md:flex w-[72px] shrink-0 flex-col items-center border-r border-border bg-background">
          {/* Expand button */}
          <div className="flex w-full items-center justify-center border-b border-border py-2">
            <button
              type="button"
              onClick={() => setShowList(true)}
              aria-label="Abrir lista de atendimentos"
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
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Conversation avatars */}
          <div className="scroll-pretty flex flex-1 flex-col items-center gap-2 overflow-y-auto py-2">
            {conversations.map((conv) => {
              const name = conversationDisplayName(conv);
              const initials = name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0] ?? "")
                .join("")
                .toUpperCase();

              const unread = conv.unreadCount ?? 0;
              const lastTs = conv.lastMessageAt ?? conv.createdAt.getTime();
              const mins = minutesSinceLastMessage(lastTs);

              let borderClass = "border-transparent";
              if (unread > 0 && mins !== null) {
                if (mins > 10) borderClass = "border-red-500";
                else if (mins > 5) borderClass = "border-orange-500";
                else borderClass = "border-amber-300";
              }

              const wsColor = workspaceColorMap.get(conv.workspaceId);

              return (
                <div key={conv._id} className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openConversation(conv._id)}
                    aria-label={name}
                    title={name}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[0.6rem] font-bold",
                      "bg-primary/10 text-primary transition-colors hover:bg-primary/20",
                      borderClass,
                      conv._id === activeConversationId && "ring-2 ring-primary ring-offset-background ring-offset-1"
                    )}
                  >
                    {initials}
                  </button>
                  {wsColor && (
                    <div
                      className="h-0.5 w-5 rounded-full"
                      style={{ backgroundColor: wsColor }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile overlay backdrop */}
      {isMobileListOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setIsMobileListOpen(false)}
        />
      )}

      {/* ── Center: Messages ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header: show list toggle when a conversation is open */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileListOpen(true)}
            aria-label="Abrir lista de atendimentos"
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-medium">
            {activeConversation ? activeClientName : "Atendimentos"}
          </span>
        </div>

        {activeConversationId && activeConversation ? (
          <MessageView
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            clientName={activeClientName}
            onSend={handleSend}
            onSendAudio={handleSendAudio}
            onToggleDetails={() => setShowDetails((v) => !v)}
            showDetails={showDetails}
            onCloseConversation={handleCloseConversation}
          />
        ) : (
          <ChatEmptyState />
        )}
      </div>

      {/* ── Right: Details ── */}
      {showDetails && activeConversationId && (
        <DetailsPanel
          chatName={activeConversation?.chatName}
          client={activeClient}
          isLoadingClient={false}
          notations={activeConversation?.notations ?? []}
          currentUserId={currentUserId}
          workspaces={workspaces}
          onClose={() => setShowDetails(false)}
          onRenameChatName={handleRenameChatName}
          onRenameClient={handleRenameClient}
          onSaveAsContact={handleSaveAsContact}
          onCreateNotation={handleCreateNotation}
          onUpdateNotation={handleUpdateNotation}
          onDeleteNotation={handleDeleteNotation}
        />
      )}
    </div>
  );
}
