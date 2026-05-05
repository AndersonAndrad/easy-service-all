import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { randomHash } from 'src/shared/utils/hash.util';
import { RedisService } from 'src/infra/redis/app/redis.service';
import { BlackListEntry, GenerateTokenInput, JwtContract, JwtPayload, OnlineSessionEntry, RefreshSessionEntry, TokenPair } from '../types/interface/jwt.interface';

const ACCESS_TOKEN_TTL_SECONDS = 5 * 60;
const SESSION_MAX_AGE_MILLISECONDS = 60 * 60 * 1000;

const BLACKLIST_KEY_PREFIX = 'black-list:';
const ONLINE_SESSION_KEY_PREFIX = 'online-session:';
const REFRESH_SESSION_KEY_PREFIX = 'refresh-session:';

@Injectable()
export class JwtService implements JwtContract {
  private readonly secret: string;
  private readonly issuer?: string;
  private readonly audience?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET must be defined');
    }
    this.secret = secret;
    this.issuer = this.configService.get<string>('JWT_ISSUER') ?? undefined;
    this.audience = this.configService.get<string>('JWT_AUDIENCE') ?? undefined;
  }

  async generateToken(input: GenerateTokenInput): Promise<TokenPair> {
    const nowMillis = Date.now();
    const nowSeconds = Math.floor(nowMillis / 1000);

    const sessionStart = nowSeconds;
    const sessionExpiresAtMillis = nowMillis + SESSION_MAX_AGE_MILLISECONDS;
    const accessTokenExpiresAtSeconds = nowSeconds + ACCESS_TOKEN_TTL_SECONDS;

    const payload: JwtPayload = {
      sub: input.id,
      name: input.name,
      email: input.email,
      roles: input.roles,
      iat: nowSeconds,
      exp: accessTokenExpiresAtSeconds,
      sessionStart,
    };

    const accessToken = this.signToken(payload);
    const refreshToken = randomHash(64);

    const onlineSessionKey = this.getOnlineSessionKey(input.id);
    const refreshSessionKey = this.getRefreshSessionKey(refreshToken);

    const onlineSession: OnlineSessionEntry = {
      userId: input.id,
      accessToken,
      refreshToken,
      sessionStart,
      expiresAt: sessionExpiresAtMillis,
      name: input.name,
      email: input.email,
      roles: input.roles,
    };

    const refreshSession: RefreshSessionEntry = {
      userId: input.id,
      accessToken,
      sessionStart,
      expiresAt: sessionExpiresAtMillis,
      refreshToken,
      name: input.name,
      email: input.email,
      roles: input.roles,
    };

    const ttlMillis = SESSION_MAX_AGE_MILLISECONDS;

    await Promise.all([this.redisService.setJson(onlineSessionKey, onlineSession, ttlMillis), this.redisService.setJson(refreshSessionKey, refreshSession, ttlMillis)]);

    return { accessToken, refreshToken };
  }

  async validateToken(accessToken: string): Promise<JwtPayload> {
    await this.ensureTokenNotBlacklisted(accessToken);

    const payload = this.verifyToken(accessToken);
    this.validatePayloadStructure(payload);

    const onlineSessionKey = this.getOnlineSessionKey(payload.sub);
    const onlineSession = await this.redisService.getJson<OnlineSessionEntry>(onlineSessionKey);

    if (!onlineSession) {
      throw new UnauthorizedException('Session not found');
    }

    if (onlineSession.accessToken !== accessToken) {
      throw new UnauthorizedException('Token is invalid for this session');
    }

    if (onlineSession.expiresAt <= Date.now()) {
      throw new UnauthorizedException('Session expired');
    }

    return payload;
  }

  async invalidToken(accessToken: string): Promise<void> {
    if (!accessToken) {
      return;
    }

    const blackListKey = this.getBlackListKey(accessToken);
    const decoded = jwt.decode(accessToken) as JwtPayload | null;

    const nowMillis = Date.now();
    let expiresAtMillis = nowMillis + SESSION_MAX_AGE_MILLISECONDS;

    if (decoded?.exp) {
      expiresAtMillis = decoded.exp * 1000;
    }

    const entry: BlackListEntry = {
      accessToken,
      invalidatedAt: nowMillis,
      expiresAt: expiresAtMillis,
    };

    const ttlMillis = Math.max(expiresAtMillis - nowMillis, 0);

    await this.redisService.setJson(blackListKey, entry, ttlMillis);

    if (decoded?.sub) {
      const onlineSessionKey = this.getOnlineSessionKey(decoded.sub);
      const onlineSession = await this.redisService.getJson<OnlineSessionEntry>(onlineSessionKey);

      if (onlineSession) {
        await this.redisService.delete(onlineSessionKey);

        const refreshSessionKey = this.getRefreshSessionKey(onlineSession.refreshToken);
        await this.redisService.delete(refreshSessionKey);
      }
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const refreshSessionKey = this.getRefreshSessionKey(refreshToken);
    const refreshSession = await this.redisService.getJson<RefreshSessionEntry>(refreshSessionKey);

    if (!refreshSession) {
      throw new UnauthorizedException('Refresh session not found');
    }

    if (refreshSession.expiresAt <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.ensureTokenNotBlacklisted(refreshSession.accessToken);

    const onlineSessionKey = this.getOnlineSessionKey(refreshSession.userId);
    const onlineSession = await this.redisService.getJson<OnlineSessionEntry>(onlineSessionKey);

    if (!onlineSession) {
      throw new UnauthorizedException('Session not found');
    }

    if (onlineSession.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token does not belong to active session');
    }

    const nowMillis = Date.now();
    const sessionStartMillis = refreshSession.sessionStart * 1000;
    const sessionLimitMillis = sessionStartMillis + SESSION_MAX_AGE_MILLISECONDS;

    if (nowMillis >= sessionLimitMillis) {
      await this.invalidateSessionTokens(onlineSession);
      throw new UnauthorizedException('Session expired');
    }

    const nowSeconds = Math.floor(nowMillis / 1000);
    const maxExpSeconds = Math.floor(sessionLimitMillis / 1000);
    const candidateExp = nowSeconds + ACCESS_TOKEN_TTL_SECONDS;

    const expSeconds = Math.min(candidateExp, maxExpSeconds);

    if (expSeconds <= nowSeconds) {
      await this.invalidateSessionTokens(onlineSession);
      throw new UnauthorizedException('Session expired');
    }

    const payload: JwtPayload = {
      sub: refreshSession.userId,
      name: refreshSession.name,
      email: refreshSession.email,
      roles: refreshSession.roles,
      iat: nowSeconds,
      exp: expSeconds,
      sessionStart: refreshSession.sessionStart,
    };

    const newAccessToken = this.signToken(payload);
    const newRefreshToken = randomHash(64);

    await this.invalidToken(refreshSession.accessToken);

    const newOnlineSession: OnlineSessionEntry = {
      userId: refreshSession.userId,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionStart: refreshSession.sessionStart,
      expiresAt: sessionLimitMillis,
      name: refreshSession.name,
      email: refreshSession.email,
      roles: refreshSession.roles,
    };

    const newRefreshSession: RefreshSessionEntry = {
      userId: refreshSession.userId,
      accessToken: newAccessToken,
      sessionStart: refreshSession.sessionStart,
      expiresAt: sessionLimitMillis,
      refreshToken: newRefreshToken,
      name: refreshSession.name,
      email: refreshSession.email,
      roles: refreshSession.roles,
    };

    const remainingTtlMillis = Math.max(sessionLimitMillis - nowMillis, 0);

    await Promise.all([this.redisService.setJson(onlineSessionKey, newOnlineSession, remainingTtlMillis), this.redisService.setJson(this.getRefreshSessionKey(newRefreshToken), newRefreshSession, remainingTtlMillis)]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  private signToken(payload: JwtPayload): string {
    const options: jwt.SignOptions = {
      algorithm: 'HS256',
      issuer: this.issuer,
      audience: this.audience,
    };

    return jwt.sign(payload, this.secret, options);
  }

  private verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }

      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Token is invalid or malformed');
      }

      throw new UnauthorizedException('Unauthorized');
    }
  }

  private validatePayloadStructure(payload: JwtPayload): void {
    if (!payload.sub || !payload.name || !payload.email || !Array.isArray(payload.roles)) {
      throw new UnauthorizedException('Token payload is invalid');
    }
  }

  private async ensureTokenNotBlacklisted(accessToken: string): Promise<void> {
    const blackListKey = this.getBlackListKey(accessToken);
    const blackListEntry = await this.redisService.getJson<BlackListEntry>(blackListKey);

    if (blackListEntry) {
      throw new UnauthorizedException('Token is in blacklist');
    }
  }

  private async invalidateSessionTokens(onlineSession: OnlineSessionEntry): Promise<void> {
    await this.invalidToken(onlineSession.accessToken);
  }

  private getBlackListKey(accessToken: string): string {
    return `${BLACKLIST_KEY_PREFIX}${accessToken}`;
  }

  private getOnlineSessionKey(userId: string): string {
    return `${ONLINE_SESSION_KEY_PREFIX}${userId}`;
  }

  private getRefreshSessionKey(refreshToken: string): string {
    return `${REFRESH_SESSION_KEY_PREFIX}${refreshToken}`;
  }
}
