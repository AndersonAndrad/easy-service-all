export type ConversationType = "direct" | "group";
export interface ConversationParticipant {
    name: string;
    phone: string;
    customName?: string;
}
export interface Notation {
    id: string;
    content: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Conversation {
    _id: string;
    createdAt: Date;
    conversationKey: string;
    workspaceId: string;
    whatsappSessionId: string;
    type: ConversationType;
    attendant: ConversationParticipant;
    participants: ConversationParticipant[];
    groupJid?: string;
    groupName?: string;
    chatName?: string;
    notations: Notation[];
    /** UI-only — not part of server payload, tracked locally */
    lastMessageAt?: number;
    /** UI-only — not part of server payload, tracked locally */
    unreadCount?: number;
    /** UI-only — preview text of the last message */
    lastMessagePreview?: string;
}
export type MessageStatus = "sent" | "read";
export type MessageType = "text" | "audio" | "file" | "image";
export type SenderType = "agent" | "client";
export type Message = {
    _id: string;
    createdAt: Date;
    conversationKey: string;
    workspaceId: string;
    whatsappSessionId: string;
    sendBy?: string;
    status?: MessageStatus;
    payload: {
        text?: string;
        media?: {
            url: string;
            size: number;
            duration?: number;
        };
    };
    type: MessageType;
    attendant: ConversationParticipant;
    client: ConversationParticipant;
};
export type Client = {
    _id: string;
    workspaceId: string;
    name?: string;
    phone: string;
    document?: string;
    createdAt: number;
};
export type SendMessageBody = {
    conversationId: string;
    workspaceId: string;
    type: MessageType;
    content: string;
};
//# sourceMappingURL=conversation.d.ts.map