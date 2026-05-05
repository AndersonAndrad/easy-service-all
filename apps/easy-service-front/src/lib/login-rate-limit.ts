const FAIL_KEY = "es_login_fail_count";
const LOCKOUT_KEY = "es_login_lockout_until";

function readCount(): number {
  if (typeof window === "undefined") return 0;
  const v = parseInt(sessionStorage.getItem(FAIL_KEY) ?? "0", 10);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

function readLockoutUntil(): number {
  if (typeof window === "undefined") return 0;
  const v = parseInt(sessionStorage.getItem(LOCKOUT_KEY) ?? "0", 10);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function getFailureCount(): number {
  return readCount();
}

export function isLoginLockedOut(): boolean {
  const count = readCount();
  if (count < 3) return false;
  return Date.now() < readLockoutUntil();
}

export function getRemainingLockoutMs(): number {
  return Math.max(0, readLockoutUntil() - Date.now());
}

function lockoutDurationMs(failureCount: number): number {
  if (failureCount < 3) return 0;
  return Math.min(60_000, 15_000 + (failureCount - 3) * 10_000);
}

export function recordLoginFailure(): void {
  const next = readCount() + 1;
  sessionStorage.setItem(FAIL_KEY, String(next));
  if (next >= 3) {
    const until = Date.now() + lockoutDurationMs(next);
    sessionStorage.setItem(LOCKOUT_KEY, String(until));
  }
}

export function clearLoginPenalty(): void {
  sessionStorage.removeItem(FAIL_KEY);
  sessionStorage.removeItem(LOCKOUT_KEY);
}
