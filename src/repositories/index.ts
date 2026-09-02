import { LocalStorageRepository } from './localStorageRepository';
import type { WorkoutRepository } from './types';

export { LocalStorageRepository, STORAGE_KEYS } from './localStorageRepository';
export { SafeStorage, MemoryStorage, resolveStorage } from './storageDriver';
export type { KeyValueStorage } from './storageDriver';
export type { WorkoutRepository, RecoveryNotice } from './types';

let instance: WorkoutRepository | null = null;

/**
 * Single place where the storage backend is chosen.
 *
 * Swapping to Supabase or IndexedDB later means implementing
 * `WorkoutRepository` and returning it here — no component or hook changes,
 * because everything downstream only ever sees the interface.
 */
export function createRepository(): WorkoutRepository {
  if (!instance) {
    instance = new LocalStorageRepository();
  }
  return instance;
}

/** Test seam: lets a suite install a fake repository. */
export function setRepository(repository: WorkoutRepository | null): void {
  instance = repository;
}
