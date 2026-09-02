import type { z } from 'zod';
import type { RecoveryNotice } from './types';

/** Minimal subset of the Web Storage API that this app depends on. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

/**
 * Fallback used when localStorage is unavailable — Safari private mode, an
 * embedded webview with storage disabled, or a non-browser test environment.
 * The app stays fully usable for the session; nothing persists.
 */
export class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  get length(): number {
    return this.map.size;
  }
}

/** Returns localStorage when it is actually writable, otherwise an in-memory stand-in. */
export function resolveStorage(): KeyValueStorage {
  try {
    const probe = '__fit2fit_probe__';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

/**
 * Validating wrapper around key/value storage.
 *
 * Anything that fails to parse or validate is quarantined under a `corrupt:`
 * key and replaced by the caller's fallback, so one bad record can never stop
 * the app from starting.
 */
export class SafeStorage {
  private notices: RecoveryNotice[] = [];
  private readonly storage: KeyValueStorage;

  constructor(storage: KeyValueStorage) {
    this.storage = storage;
  }

  read<T>(key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: T): T {
    const raw = this.storage.getItem(key);
    if (raw === null) return fallback;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.quarantine(key, raw, 'invalid JSON');
      return fallback;
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      this.quarantine(key, raw, result.error.issues[0]?.message ?? 'failed validation');
      return fallback;
    }

    return result.data;
  }

  write(key: string, value: unknown): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Most likely a quota error. Surface it rather than failing silently.
      this.notices.push({
        key,
        reason: error instanceof Error ? error.message : 'write failed',
      });
    }
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  /** Every stored key, snapshotted before mutation to keep iteration safe. */
  keys(): string[] {
    const result: string[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key !== null) result.push(key);
    }
    return result;
  }

  getNotices(): RecoveryNotice[] {
    return [...this.notices];
  }

  private quarantine(key: string, raw: string, reason: string): void {
    const backupKey = `fit2fit:corrupt:${key}:${Date.now()}`;
    try {
      this.storage.setItem(backupKey, raw);
    } catch {
      // If even the backup cannot be written, dropping the value is still better
      // than blocking startup.
    }
    this.storage.removeItem(key);
    this.notices.push({ key, reason, backupKey });
  }
}
