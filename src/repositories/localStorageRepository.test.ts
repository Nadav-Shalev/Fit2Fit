import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/models/settings';
import { makeDatabase, makeProgram, makeWorkoutSession } from '@/test/factories';
import { LocalStorageRepository, STORAGE_KEYS } from './localStorageRepository';
import { MemoryStorage } from './storageDriver';

describe('LocalStorageRepository', () => {
  let storage: MemoryStorage;
  let repository: LocalStorageRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new LocalStorageRepository(storage);
  });

  it('reports an empty database before anything is written', async () => {
    const database = await repository.loadAll();
    expect(database.schemaVersion).toBe(0);
    expect(database.programs).toEqual([]);
    expect(database.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a program', async () => {
    const program = makeProgram({ id: 'p1', name: 'Workout A' });
    await repository.saveProgram(program);
    expect(await repository.getProgram('p1')).toEqual(program);
    expect(await repository.getPrograms()).toHaveLength(1);
  });

  it('updates an existing record instead of duplicating it', async () => {
    const program = makeProgram({ id: 'p1', name: 'Workout A' });
    await repository.saveProgram(program);
    await repository.saveProgram({ ...program, name: 'Renamed' });

    const programs = await repository.getPrograms();
    expect(programs).toHaveLength(1);
    expect(programs[0]?.name).toBe('Renamed');
  });

  it('deletes a record', async () => {
    await repository.saveProgram(makeProgram({ id: 'p1' }));
    await repository.deleteProgram('p1');
    expect(await repository.getPrograms()).toEqual([]);
  });

  it('stores and clears the active workout separately', async () => {
    const active = makeWorkoutSession({ id: 'live', status: 'active' });
    await repository.setActiveWorkout(active);
    expect((await repository.getActiveWorkout())?.id).toBe('live');
    // Sessions and the active workout live under different keys.
    expect(await repository.getWorkoutSessions()).toEqual([]);

    await repository.setActiveWorkout(null);
    expect(await repository.getActiveWorkout()).toBeNull();
  });

  it('replaces and reloads the whole database', async () => {
    const database = makeDatabase({
      programs: [makeProgram({ id: 'p1' })],
      workoutSessions: [makeWorkoutSession({ id: 'w1' })],
    });
    await repository.replaceAll(database);

    const loaded = await repository.loadAll();
    expect(loaded.programs).toHaveLength(1);
    expect(loaded.workoutSessions).toHaveLength(1);
    expect(loaded.schemaVersion).toBe(database.schemaVersion);
  });

  it('clears every key it owns', async () => {
    await repository.replaceAll(makeDatabase({ programs: [makeProgram()] }));
    await repository.clearAll();
    expect(await repository.getPrograms()).toEqual([]);
    expect((await repository.loadAll()).schemaVersion).toBe(0);
  });

  describe('corrupt data recovery', () => {
    it('falls back to an empty list when the stored JSON is unparsable', async () => {
      storage.setItem(STORAGE_KEYS.programs, '{{{ not json');

      expect(await repository.getPrograms()).toEqual([]);
      const notices = repository.getRecoveryNotices();
      expect(notices).toHaveLength(1);
      expect(notices[0]?.key).toBe(STORAGE_KEYS.programs);
    });

    it('quarantines the unreadable value instead of discarding it', async () => {
      storage.setItem(STORAGE_KEYS.programs, 'garbage');
      await repository.getPrograms();

      const backupKey = repository.getRecoveryNotices()[0]?.backupKey;
      expect(backupKey).toBeDefined();
      expect(storage.getItem(backupKey!)).toBe('garbage');
      expect(storage.getItem(STORAGE_KEYS.programs)).toBeNull();
    });

    it('rejects structurally valid JSON that violates the schema', async () => {
      storage.setItem(STORAGE_KEYS.programs, JSON.stringify([{ id: 'p1', name: 42 }]));
      expect(await repository.getPrograms()).toEqual([]);
      expect(repository.getRecoveryNotices()).toHaveLength(1);
    });

    it('keeps the rest of the database readable when one key is corrupt', async () => {
      await repository.replaceAll(
        makeDatabase({
          programs: [makeProgram({ id: 'p1' })],
          workoutSessions: [makeWorkoutSession({ id: 'w1' })],
        }),
      );
      storage.setItem(STORAGE_KEYS.programs, 'broken');

      const database = await repository.loadAll();
      expect(database.programs).toEqual([]);
      expect(database.workoutSessions).toHaveLength(1);
    });

    it('replaces individual bad settings with their defaults', async () => {
      storage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'neon', weekStartsOn: 9 }),
      );

      const settings = await repository.getSettings();
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(settings.weekStartsOn).toBe(DEFAULT_SETTINGS.weekStartsOn);
    });

    it('backfills preferences that a stored settings object predates', async () => {
      const { showPreviousPerformance: _omitted, ...partial } = DEFAULT_SETTINGS;
      storage.setItem(STORAGE_KEYS.settings, JSON.stringify(partial));
      expect((await repository.getSettings()).showPreviousPerformance).toBe(true);
    });
  });
});
