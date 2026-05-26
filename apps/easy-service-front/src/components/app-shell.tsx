"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AppMobileMenuButton,
  AppMobileOverlay,
  AppSidebar,
} from "@/components/app-sidebar";
import { cn } from "@/lib/utils";

const COLLAPSED_STORAGE_KEY = "es_sidebar_collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const v = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
        if (v === "1") setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistCollapsed = useCallback((value: boolean) => {
    setCollapsed(value);
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    persistCollapsed(!collapsed);
  }, [collapsed, persistCollapsed]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="relative flex min-h-screen bg-background">
      <AppMobileMenuButton onOpen={() => setMobileOpen(true)} />
      <AppMobileOverlay visible={mobileOpen} onClose={closeMobile} />
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      <main
        id="main"
        className={cn(
          "flex min-h-screen flex-1 flex-col transition-[padding] duration-200 ease-out",
          "pl-0 pt-14",
          collapsed ? "md:pl-16" : "md:pl-64",
          "md:pt-0"
        )}
      >
        {children}
      </main>
    </div>
  );
}
