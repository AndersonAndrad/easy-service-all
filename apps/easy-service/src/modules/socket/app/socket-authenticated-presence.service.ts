import { Injectable } from '@nestjs/common';

@Injectable()
export class SocketAuthenticatedPresenceService {
  private readonly userIdToCount = new Map<string, number>();

  addAuthenticatedSocket(userId: string): void {
    const key = userId.trim();
    if (!key) {
      return;
    }
    this.userIdToCount.set(key, (this.userIdToCount.get(key) ?? 0) + 1);
  }

  removeAuthenticatedSocket(userId: string): void {
    const key = userId.trim();
    if (!key) {
      return;
    }
    const next = (this.userIdToCount.get(key) ?? 0) - 1;
    if (next <= 0) {
      this.userIdToCount.delete(key);
      return;
    }
    this.userIdToCount.set(key, next);
  }

  hasAuthenticatedSocket(userId: string): boolean {
    return (this.userIdToCount.get(userId.trim()) ?? 0) > 0;
  }
}
