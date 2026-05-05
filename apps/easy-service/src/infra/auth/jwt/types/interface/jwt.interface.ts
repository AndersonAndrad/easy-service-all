export type JwtRole = string;

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  roles: JwtRole[];
  iat: number;
  exp: number;
  sessionStart: number;
}

export interface GenerateTokenInput {
  id: string;
  name: string;
  email: string;
  roles: JwtRole[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtContract {
  generateToken(input: GenerateTokenInput): Promise<TokenPair>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  invalidToken(accessToken: string): Promise<void>;
  validateToken(accessToken: string): Promise<JwtPayload>;
}

export interface BlackListEntry {
  accessToken: string;
  invalidatedAt: number;
  expiresAt: number;
}

export interface OnlineSessionEntry {
  userId: string;
  accessToken: string;
  refreshToken: string;
  sessionStart: number;
  expiresAt: number;
  name: string;
  email: string;
  roles: JwtRole[];
}

export interface RefreshSessionEntry {
  userId: string;
  accessToken: string;
  sessionStart: number;
  expiresAt: number;
  refreshToken: string;
  name: string;
  email: string;
  roles: JwtRole[];
}
