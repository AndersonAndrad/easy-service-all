import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { decodeJwtPayload } from "@/lib/jwt";

const ONE_DAY_SEC = 86400;
const MAX_SESSION_SEC = 14 * ONE_DAY_SEC;

function computeMaxAgeSeconds(accessToken: string, refreshToken: string): number {
  const nowSec = Math.floor(Date.now() / 1000);
  const r = decodeJwtPayload(refreshToken);
  if (r?.exp != null && typeof r.exp === "number") {
    return Math.min(MAX_SESSION_SEC, Math.max(60, r.exp - nowSec));
  }
  const a = decodeJwtPayload(accessToken);
  if (a?.exp != null && typeof a.exp === "number") {
    return Math.min(7 * ONE_DAY_SEC, Math.max(60, a.exp - nowSec));
  }
  return 7 * ONE_DAY_SEC;
}

export function setSessionCookie(accessToken: string, refreshToken: string): void {
  const maxAge = computeMaxAgeSeconds(accessToken, refreshToken);
  document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
}
