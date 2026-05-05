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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border px-2 py-3",
          compact ? "justify-center" : "justify-between"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden shrink-0 md:inline-flex"
          onClick={onToggleCollapsed}
          aria-expanded={!compact}
          aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
        >
          <NavIconPanelLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="inline-flex shrink-0 md:hidden"
          onClick={() => onMobileOpenChange(false)}
          aria-label="Close menu"
        >
          <NavIconPanelLeft className="size-5 rotate-180" />
        </Button>
      </div>

      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border px-3 py-4",
          compact && "items-center px-2"
        )}
      >
        <Avatar
          className={cn("ring-2 ring-border", compact ? "size-10" : "size-12")}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <AvatarFallback className="bg-primary/15 text-primary">
              {initials(displayName, displayEmail)}
            </AvatarFallback>
          )}
        </Avatar>
        {!compact ? (
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground" title={displayEmail}>
              {displayEmail || "—"}
            </p>
          </div>
        ) : null}
      </div>

      <Separator />

      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 py-3"
        aria-label="Main navigation"
      >
        {navigationCategories.map((category) => (
          <details
            key={category.id}
            className="group rounded-lg border border-transparent open:border-border open:bg-muted/40"
            open
          >
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground outline-none hover:bg-accent/60 [&::-webkit-details-marker]:hidden",
                compact && "justify-center px-0"
              )}
              title={compact ? category.label : undefined}
            >
              <NavIcon
                name={category.icon}
                className="size-4 shrink-0 text-muted-foreground"
              />
              {!compact ? (
                <>
                  <span className="min-w-0 flex-1 truncate">{category.label}</span>
                  <NavIcon
                    name="chevron-down"
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  />
                </>
              ) : null}
            </summary>
            {!compact ? (
              <ul className="space-y-0.5 pb-2 pl-2 pt-1" role="list">
                {category.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        <NavIcon name={item.icon} className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="flex flex-col items-center gap-1 pb-2 pt-1" role="list">
                {category.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-md transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                      >
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

      <Separator />

      <div
        className={cn(
          "mt-auto flex shrink-0 flex-col gap-2 px-3 py-4",
          compact && "items-center px-2"
        )}
      >
        {!compact ? (
          <p className="text-center text-[10px] text-muted-foreground">
            v{APP_VERSION}
          </p>
        ) : (
          <span
            className="text-[10px] text-muted-foreground"
            title={`v${APP_VERSION}`}
          >
            v{APP_VERSION.slice(0, 3)}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "default"}
          className={cn("gap-2", !compact && "w-full justify-center")}
          onClick={() => signOut()}
          aria-label="Log out"
        >
          <NavIcon name="log-out" className="size-4 shrink-0" />
          {!compact ? <span>Sair</span> : null}
        </Button>
      </div>
    </>
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 max-w-[min(100vw,16rem)] flex-col border-r border-border bg-background shadow-sm transition-[width,transform] duration-200 ease-out",
        compact && "md:w-16 md:max-w-none",
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
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="fixed left-4 top-4 z-30 md:hidden"
      onClick={onOpen}
      aria-label="Open menu"
    >
      <NavIconMenu className="size-5" />
    </Button>
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
      className="fixed inset-0 z-40 bg-black/40 md:hidden"
      aria-label="Close menu overlay"
      onClick={onClose}
    />
  );
}
