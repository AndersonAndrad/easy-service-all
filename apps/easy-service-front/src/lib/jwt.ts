export type JwtPayload = {
  exp?: number;
  iat?: number;
  sub?: string;
  /** When present (e.g. Mongo user id), may align with workspace `userOwnerId` for API filters. */
  userOwnerId?: string;
  email?: string;
  name?: string;
  picture?: string;
  preferred_username?: string;
  [key: string]: unknown;
};

function base64UrlToUtf8(segment: string): string {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = base64UrlToUtf8(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getJwtExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (payload?.exp == null || typeof payload.exp !== "number") return null;
  return payload.exp * 1000;
}
