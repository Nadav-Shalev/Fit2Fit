import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '@/models/database';
import { makeDatabase, makeProgram, makeRunningSession, makeWorkoutSession } from '@/test/factories';
import { applyImport, buildBackup, parseBackup, serializeBackup } from './backupService';

const validBackup = () => serializeBackup(makeDatabase({ programs: [makeProgram({ id: 'p1' })] }));

describe('buildBackup', () => {
  it('wraps the database in an identifiable envelope', () => {
    const backup = buildBackup(makeDatabase());
    expect(backup.app).toBe('fit2fit');
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('parseBackup', () => {
  it('accepts a file this app produced', () => {
    const result = parseBackup(validBackup());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.programs).toBe(1);
      expect(result.backup.data.programs[0]?.id).toBe('p1');
    }
  });

  it('rejects malformed JSON', () => {
    const result = parseBackup('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.messageKey).toBe('backup.invalidJson');
  });

  it('rejects JSON that is not a Fit2Fit backup', () => {
    const result = parseBackup(JSON.stringify({ hello: 'world' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.messageKey).toBe('backup.notBackupFile');
  });

  it('rejects a primitive payload', () => {
    const result = parseBackup('42');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.messageKey).toBe('backup.notBackupFile');
  });

  it('rejects a backup written by a newer schema version', () => {
    const backup = JSON.parse(validBackup()) as Record<string, unknown>;
    backup.schemaVersion = SCHEMA_VERSION + 1;
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.messageKey).toBe('backup.unsupportedVersion');
  });

  it('rejects a backup with a missing required field', () => {
    const backup = JSON.parse(validBackup()) as { data: Record<string, unknown> };
    delete backup.data.programs;
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.messageKey).toBe('backup.invalidStructure');
  });

  it('rejects a backup where a field has the wrong type', () => {
    const backup = JSON.parse(validBackup()) as { data: Record<string, unknown> };
    backup.data.workoutSessions = 'not an array';
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.messageKey).toBe('backup.invalidStructure');
      expect(result.error.detail).toContain('workoutSessions');
    }
  });

  it('rejects a record that violates a value constraint', () => {
    const backup = JSON.parse(validBackup()) as {
      data: { workoutSessions: unknown[] };
    };
    backup.data.workoutSessions = [{ ...makeWorkoutSession(), date: '31/08/2026' }];
    const result = parseBackup(JSON.stringify(backup));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.detail).toContain('date');
  });
});

describe('applyImport', () => {
  const current = makeDatabase({
    programs: [makeProgram({ id: 'p1', name: 'Mine' })],
    workoutSessions: [makeWorkoutSession({ id: 'w1' })],
    schedule: { entries: [{ id: 's1', dayOfWeek: 0, kind: 'strength', programId: 'p1' }] },
  });

  const incoming = makeDatabase({
    programs: [makeProgram({ id: 'p1', name: 'Theirs' }), makeProgram({ id: 'p2' })],
    workoutSessions: [makeWorkoutSession({ id: 'w2' })],
    runningSessions: [makeRunningSession({ id: 'r1' })],
    schedule: { entries: [{ id: 's2', dayOfWeek: 3, kind: 'strength', programId: 'p2' }] },
  });

  it('replaces everything in replace mode', () => {
    const result = applyImport(current, incoming, 'replace');
    expect(result.programs.map((program) => program.id)).toEqual(['p1', 'p2']);
    expect(result.programs[0]?.name).toBe('Theirs');
    expect(result.workoutSessions.map((session) => session.id)).toEqual(['w2']);
  });

  it('adds only unseen records in merge mode', () => {
    const result = applyImport(current, incoming, 'merge');
    expect(result.programs.map((program) => program.id)).toEqual(['p1', 'p2']);
    // The device's own copy of a shared id wins.
    expect(result.programs[0]?.name).toBe('Mine');
    expect(result.workoutSessions.map((session) => session.id)).toEqual(['w1', 'w2']);
    expect(result.runningSessions.map((session) => session.id)).toEqual(['r1']);
  });

  it('keeps the existing weekly plan when merging', () => {
    expect(applyImport(current, incoming, 'merge').schedule.entries[0]?.id).toBe('s1');
  });

  it('takes the incoming plan when the device has none', () => {
    const empty = makeDatabase();
    expect(applyImport(empty, incoming, 'merge').schedule.entries[0]?.id).toBe('s2');
  });

  it('never lets an import clobber the workout in progress', () => {
    const active = makeDatabase({ activeWorkout: makeWorkoutSession({ id: 'live', status: 'active' }) });
    expect(applyImport(active, incoming, 'replace').activeWorkout?.id).toBe('live');
    expect(applyImport(active, incoming, 'merge').activeWorkout?.id).toBe('live');
  });
});
