import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { DEFAULT_SETTINGS } from '@/models/settings';
import { LocalStorageRepository, setRepository } from '@/repositories';
import { MemoryStorage } from '@/repositories/storageDriver';
import { useDataStore } from '@/store/useDataStore';
import { useWorkoutStore, type LiveState } from '@/store/useWorkoutStore';

const IDLE_LIVE_STATE: LiveState = {
  phase: 'overview',
  exerciseSessionId: null,
  setId: null,
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  countdownEndsAt: null,
  restStartedAt: null,
};

/**
 * End-to-end pass through the real application: boot, start a workout from the
 * seeded program, run a set through the guided flow, finish it, and confirm it
 * lands in history.
 *
 * This is the check that the store, repository, services and UI are actually
 * wired to each other, which unit tests by design cannot tell us.
 */
/**
 * The sidebar and the bottom bar are both rendered and hidden from each other
 * by CSS, which jsdom does not apply — so navigation matches twice.
 */
function navigateTo(label: string): void {
  fireEvent.click(screen.getAllByRole('link', { name: label })[0]!);
}

/** The greeting is time-dependent, so match the shape rather than the hour. */
const GREETING = /Good (morning|afternoon|evening)/;

/** Starts the named program from the programs list. */
async function startProgram(name: string): Promise<void> {
  navigateTo('Programs');
  const heading = await screen.findByRole('heading', { name });
  const card = heading.closest('div.bg-surface');
  if (!card) throw new Error(`Could not find the card for program "${name}"`);
  fireEvent.click(within(card as HTMLElement).getByRole('button', { name: 'Start' }));
}

/** Walks one set through prepare → countdown → stopwatch → done. */
async function performSet(): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: 'Start set' }));
  // The countdown is skippable, which keeps the test free of fake timers.
  fireEvent.click(await screen.findByRole('button', { name: 'Tap to skip' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Set done' }));
}

describe('Fit2Fit application', () => {
  beforeEach(async () => {
    const repository = new LocalStorageRepository(new MemoryStorage());
    setRepository(repository);

    // Seed the language before first run so the demo content is generated in
    // English, which keeps the assertions below readable.
    await repository.saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });

    useDataStore.setState({ status: 'idle' });
    // Reset the guided-workout position too, so a test that stops mid-set
    // cannot leak its phase into the next one.
    useWorkoutStore.setState({ session: null, hydrated: false, live: IDLE_LIVE_STATE });

    // HashRouter reads the real location, which persists between tests.
    window.location.hash = '#/';
  });

  it('boots with demo data and greets the user with the week so far', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: GREETING })).toBeInTheDocument();
    // The weekly counters are derived from the seeded plan and history.
    expect(await screen.findByText(/This week you have done/)).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    // Three weeks of seeded history mean the charts and summaries have data.
    expect(useDataStore.getState().workoutSessions.length).toBeGreaterThan(0);
  });

  it('runs a guided workout: set timer, rest, finish, and record it in history', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: GREETING });

    // Start from the programs tab so the choice of program is explicit rather
    // than dependent on which day the suite happens to run.
    await startProgram('Workout A');

    // Workout mode opens on the checklist, with nothing done yet.
    expect(await screen.findByText('0/7 exercises done')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(await screen.findByText('Set 1 of 3')).toBeInTheDocument();

    await performSet();

    // Finishing a set banks the result and drops straight into rest.
    const active = useWorkoutStore.getState().session;
    const firstSet = active?.exercises[0]?.sets[0];
    expect(firstSet?.completed).toBe(true);
    expect(firstSet?.actualReps).toBe(15);
    expect(firstSet?.workSeconds).toBeGreaterThanOrEqual(0);

    fireEvent.click(await screen.findByRole('button', { name: 'Skip rest' }));

    // Rest ends on the preparation screen for the next set of the same exercise.
    expect(await screen.findByText('Set 2 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to exercises' }));
    expect(await screen.findByText('0/7 exercises done')).toBeInTheDocument();

    // Stopping before every exercise is done must still save the work.
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }));
    expect(await screen.findByRole('heading', { name: /Workout A complete/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }));

    // The overall effort rating is required before the workout can be saved.
    fireEvent.click(await screen.findByRole('button', { name: 'Save workout' }));
    expect(await screen.findByText('Pick an effort level to finish the workout')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RPE 8' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save workout' }));

    // Finishing navigates to history, where the workout now appears alongside
    // the seeded history.
    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument();

    await waitFor(() => {
      // Match on the session that was just performed, not the seeded history.
      const saved = useDataStore
        .getState()
        .workoutSessions.find((session) => session.id === active?.id);
      expect(saved?.status).toBe('completed');
      expect(saved?.rpe).toBe(8);
      expect(saved?.programName).toBe('Workout A');
      expect(saved?.exercises[0]?.sets[0]?.actualReps).toBe(15);
    });

    // The active workout has been cleared, so the app is idle again.
    expect(useWorkoutStore.getState().session).toBeNull();
  });

  it('restores an interrupted workout after a reload', async () => {
    const { unmount } = render(<App />);
    await screen.findByRole('heading', { name: GREETING });

    await startProgram('Workout A');
    await screen.findByText('0/7 exercises done');

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await performSet();
    await waitFor(() =>
      expect(useWorkoutStore.getState().session?.exercises[0]?.sets[0]?.completed).toBe(true),
    );

    // Simulate a page refresh: tear the tree down and reset in-memory state,
    // leaving only what was written to storage.
    unmount();
    useDataStore.setState({ status: 'idle' });
    useWorkoutStore.setState({ session: null, hydrated: false });
    // Come back to the dashboard rather than deep-linking into the workout, so
    // the resume banner is what proves the session survived.
    window.location.hash = '#/';

    render(<App />);

    await waitFor(() => {
      const restored = useWorkoutStore.getState().session;
      expect(restored?.status).toBe('active');
      // The logged set and its measured duration both survive the reload.
      expect(restored?.exercises[0]?.sets[0]?.completed).toBe(true);
      expect(restored?.exercises[0]?.sets[0]?.workSeconds).toBeGreaterThanOrEqual(0);
    });

    expect(await screen.findByText('Workout in progress')).toBeInTheDocument();
  });
});
