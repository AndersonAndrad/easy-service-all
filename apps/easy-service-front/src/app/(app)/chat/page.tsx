import type { Metadata } from "next";

import { ChatPanel } from "@/components/chat/chat-panel";

export const metadata: Metadata = {
  title: "Chat - Atendimento",
  description: "Central de atendimento via chat.",
};

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:h-[100dvh]">
      <ChatPanel />
    </div>
  );
}
