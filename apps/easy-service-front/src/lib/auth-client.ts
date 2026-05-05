import { isAxiosError } from "axios";
import { publicApiClient } from "@/lib/http/public-api-client";
import type { AuthTokens, LoginBody } from "@easy-service/shared";

export type { AuthTokens, LoginBody };

export function isAuthTokensPayload(data: unknown): data is AuthTokens {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.accessToken === "string" &&
    o.accessToken.length > 0 &&
    typeof o.refreshToken === "string" &&
    o.refreshToken.length > 0
  );
}

export async function loginRequest(body: LoginBody): Promise<AuthTokens> {
  const { data } = await publicApiClient.post<unknown>("/auth/login", body);
  if (!isAuthTokensPayload(data)) {
    throw new Error("Resposta inválida do servidor.");
  }
  return data;
}

export async function refreshTokenRequest(refreshToken: string): Promise<AuthTokens> {
  const { data } = await publicApiClient.post<unknown>("/auth/refresh-token", {
    refreshToken,
  });
  if (!isAuthTokensPayload(data)) {
    throw new Error("Resposta inválida do servidor.");
  }
  return data;
}

function extractMessage(data: unknown): string | null {
  if (data === null || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  const msg =
    (typeof payload.message === "string" && payload.message) ||
    (typeof payload.error === "string" && payload.error) ||
    (typeof payload.detail === "string" && payload.detail);
  return msg || null;
}

export async function parseErrorMessage(error: unknown): Promise<string> {
  if (isAxiosError(error)) {
    const msg = extractMessage(error.response?.data);
    if (msg) return msg;
    const status = error.response?.status;
    if (!status) return "Falha de conexão com o servidor.";
    return `Erro na requisição (${status}).`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Erro inesperado.";
}
