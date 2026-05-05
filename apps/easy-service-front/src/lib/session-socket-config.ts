import { getPublicApiBaseUrl } from "@/lib/env";

export function getSessionSocketUrl(): string {
  const custom = process.env.NEXT_PUBLIC_SESSION_SOCKET_URL?.trim();
  if (custom) {
    return custom.replace(/\/$/, "");
  }
  return getPublicApiBaseUrl();
}

export function getSocketIoPath(): string {
  const raw = process.env.NEXT_PUBLIC_SOCKET_IO_PATH?.trim();
  if (raw && raw.startsWith("/")) {
    return raw;
  }
  return "/socket.io";
}
