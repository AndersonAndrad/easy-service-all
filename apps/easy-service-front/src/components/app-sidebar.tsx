"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import {
  NavIcon,
  NavIconMenu,
  NavIconPanelLeft,
} from "@/components/icons/nav-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { navigationCategories } from "@/config/navigation";
import { useAuth } from "@/contexts/auth-context";
import { APP_VERSION } from "@/lib/app-version";
import type { JwtPayload } from "@/lib/jwt";
import { cn } from "@/lib/utils";

function getDisplayName(user: JwtPayload | null): string {
  if (!user) return "User";
  if (typeof user.name === "string" && user.name.trim()) return user.name.trim();
  if (typeof user.preferred_username === "string" && user.preferred_username)
    return user.preferred_username;
  if (typeof user.email === "string" && user.email) return user.email.split("@")[0] ?? "User";
  if (typeof user.sub === "string" && user.sub) return user.sub;
  return "User";
}

function getDisplayEmail(user: JwtPayload | null): string {
  if (!user) return "";
  if (typeof user.email === "string" && user.email) return user.email;
  return "";
}

function getAvatarSrc(user: JwtPayload | null): string | null {
  if (!user || typeof user.picture !== "string") return null;
  const u = user.picture.trim();
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")) return u;
  return null;
}

function initials(name: string, email: string): string {
  const s = name || email || "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return s.slice(0, 2).toUpperCase();
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const displayEmail = useMemo(() => getDisplayEmail(user), [user]);
  const avatarSrc = useMemo(() => getAvatarSrc(user), [user]);

  const compact = collapsed && !mobileOpen;

  useEffect(() => {
    onMobileOpenChange(false);
  }, [pathname, onMobileOpenChange]);

  const sidebarInner = (
    <>
      {/* Top bar — logo / toggle */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border px-3",
          compact ? "justify-center" : "justify-between"
        )}
      >
        {!compact && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">
              ES
            </span>
            <span className="text-sm font-semibold text-sidebar-foreground">Easy Service</span>
          </div>
        )}
        <button
          type="button"
          onClick={compact ? onToggleCollapsed : onToggleCollapsed}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/5 hover:text-white/70 md:flex"
          aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
        >
          <NavIconPanelLeft className={cn("size-4", compact && "rotate-180")} />
        </button>
        <button
          type="button"
          onClick={() => onMobileOpenChange(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/5 hover:text-white/70 md:hidden"
          aria-label="Close menu"
        >
          <NavIconPanelLeft className="size-4 rotate-180" />
        </button>
      </div>

      {/* User section */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-sidebar-border px-3 py-4",
          compact && "justify-center px-2"
        )}
      >
        <Avatar className="shrink-0 ring-1 ring-sidebar-primary/40" style={{ width: compact ? 36 : 32, height: compact ? 36 : 32 }}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <AvatarFallback className="bg-sidebar-primary/20 text-xs font-semibold text-sidebar-primary">
              {initials(displayName, displayEmail)}
            </AvatarFallback>
          )}
        </Avatar>
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-white/35" title={displayEmail}>
              {displayEmail || "—"}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-3"
        aria-label="Main navigation"
      >
        {navigationCategories.map((category) => (
          <details key={category.id} className="group" open>
            {!compact ? (
              <summary className="mb-0.5 flex cursor-pointer list-none select-none items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25 outline-none transition-colors hover:text-white/45 [&::-webkit-details-marker]:hidden">
                <span className="flex-1 truncate">{category.label}</span>
                <NavIcon
                  name="chevron-down"
                  className="size-3 shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
            ) : (
              <summary className="hidden [&::-webkit-details-marker]:hidden" />
            )}

            {!compact ? (
              <ul className="mb-1 flex flex-col gap-0.5" role="list">
                {category.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary/10 text-sidebar-primary"
                            : "text-white/45 hover:bg-white/5 hover:text-white/80"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-sidebar-primary" />
                        )}
                        <NavIcon name={item.icon} className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="flex flex-col items-center gap-0.5 pb-1" role="list">
                {category.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                          active
                            ? "bg-sidebar-primary/10 text-sidebar-primary"
                            : "text-white/40 hover:bg-white/5 hover:text-white/80"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-sidebar-primary" />
                        )}
                        <NavIcon name={item.icon} className="size-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "mt-auto flex shrink-0 flex-col items-center gap-3 border-t border-sidebar-border px-3 py-4",
          compact && "px-2"
        )}
      >
        <button
          type="button"
          onClick={() => signOut()}
          title="Sair"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/35 transition-colors hover:bg-red-500/10 hover:text-red-400",
            compact ? "h-9 w-9 justify-center" : "w-full"
          )}
        >
          <NavIcon name="log-out" className="size-4 shrink-0" />
          {!compact && <span>Sair</span>}
        </button>
        <span className={cn("text-[10px] text-white/20", compact && "text-center")}>
          v{compact ? APP_VERSION.slice(0, 3) : APP_VERSION}
        </span>
      </div>
    </>
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar shadow-xl transition-[width,transform] duration-200 ease-out",
        compact ? "md:w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
      aria-label="Application sidebar"
    >
      {sidebarInner}
    </aside>
  );
}

export function AppMobileMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open menu"
      className="fixed left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-white/50 shadow-md transition-colors hover:text-white/90 md:hidden"
    >
      <NavIconMenu className="size-4" />
    </button>
  );
}

export function AppMobileOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
      aria-label="Close menu overlay"
      onClick={onClose}
    />
  );
}
