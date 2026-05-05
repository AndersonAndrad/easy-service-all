"use client";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { SessionSocketProvider } from "@/contexts/session-socket-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SessionSocketProvider>
        {children}
      </SessionSocketProvider>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
