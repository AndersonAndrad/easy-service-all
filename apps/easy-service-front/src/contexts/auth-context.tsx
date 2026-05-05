"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  refreshTokenRequest,
  type AuthTokens,
} from "@/lib/auth-client";
import { decodeJwtPayload, getJwtExpiryMs, type JwtPayload } from "@/lib/jwt";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-cookie";
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
} from "@/lib/token-storage";

const REFRESH_LEAD_MS = 60_000;

type AuthContextValue = {
  user: JwtPayload | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  signIn: (tokens: AuthTokens) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runRefreshRef = useRef<() => Promise<boolean>>(async () => false);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current != null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const signOut = useCallback(() => {
    clearRefreshTimer();
    clearStoredTokens();
    clearSessionCookie();
    setUser(null);
    setAccessToken(null);
    router.push("/login");
  }, [clearRefreshTimer, router]);

  const scheduleRefreshBeforeExpiry = useCallback(
    (token: string) => {
      clearRefreshTimer();
      const expMs = getJwtExpiryMs(token);
      if (expMs == null) return;
      const delay = Math.max(0, expMs - Date.now() - REFRESH_LEAD_MS);
      refreshTimerRef.current = window.setTimeout(() => {
        void runRefreshRef.current();
      }, delay);
    },
    [clearRefreshTimer]
  );

  const runRefresh = useCallback(async (): Promise<boolean> => {
    const rt = getStoredRefreshToken();
    if (!rt) {
      signOut();
      return false;
    }
    try {
      const data = await refreshTokenRequest(rt);
      setStoredTokens(data.accessToken, data.refreshToken);
      setSessionCookie(data.accessToken, data.refreshToken);
      setAccessToken(data.accessToken);
      setUser(decodeJwtPayload(data.accessToken));
      scheduleRefreshBeforeExpiry(data.accessToken);
      return true;
    } catch {
      signOut();
      return false;
    }
  }, [scheduleRefreshBeforeExpiry, signOut]);

  runRefreshRef.current = runRefresh;

  const signIn = useCallback(
    (tokens: AuthTokens) => {
      setStoredTokens(tokens.accessToken, tokens.refreshToken);
      setSessionCookie(tokens.accessToken, tokens.refreshToken);
      setAccessToken(tokens.accessToken);
      setUser(decodeJwtPayload(tokens.accessToken));
      scheduleRefreshBeforeExpiry(tokens.accessToken);
    },
    [scheduleRefreshBeforeExpiry]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const access = getStoredAccessToken();
      const refresh = getStoredRefreshToken();
      if (!access || !refresh) {
        if (!cancelled) setIsReady(true);
        return;
      }

      setSessionCookie(access, refresh);
      setAccessToken(access);
      setUser(decodeJwtPayload(access));

      const expMs = getJwtExpiryMs(access);
      if (expMs != null && expMs <= Date.now()) {
        await runRefreshRef.current();
      } else {
        scheduleRefreshBeforeExpiry(access);
      }

      if (!cancelled) setIsReady(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [scheduleRefreshBeforeExpiry]);

  useEffect(() => () => clearRefreshTimer(), [clearRefreshTimer]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isReady,
      signIn,
      signOut,
    }),
    [user, accessToken, isReady, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
