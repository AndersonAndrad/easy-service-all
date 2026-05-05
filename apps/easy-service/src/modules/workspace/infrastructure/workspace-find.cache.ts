import { Injectable } from '@nestjs/common';

import type { PaginatedResponse } from 'src/common/interface/paginated.interface';
import type { Workspace } from '../types/interfaces/workspace.interface';

const TTL_MS = 10 * 60 * 1000;

@Injectable()
export class WorkspaceFindCache {
  private readonly store = new Map<string, { expiresAt: number; data: PaginatedResponse<Workspace> }>();

  get(key: string): PaginatedResponse<Workspace> | null {
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: PaginatedResponse<Workspace>): void {
    this.store.set(key, { data, expiresAt: Date.now() + TTL_MS });
  }

  clear(): void {
    this.store.clear();
  }
}
