export function authHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

export function authConfig(token: string) {
  return { headers: authHeaders(token) };
}
