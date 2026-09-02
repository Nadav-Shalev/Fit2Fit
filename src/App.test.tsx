import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { DEFAULT_SETTINGS } from '@/models/settings';
import { LocalStorageRepository, setRepository } from '@/repositories';
import { MemoryStorage } from '@/repositories/storageDriver';
import { useDataStore } from '@/store/useDataStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';

/**
 * End-to-end pass through the real application: boot, start a workout from the
 * seeded program, log a set, finish it, and confirm it lands in history.
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

/** Starts the named program from the programs list. */
async function startProgram(name: string): Promise<void> {
  navigateTo('Programs');
  const heading = await screen.findByRole('heading', { name });
  const card = heading.closest('div.bg-surface');
  if (!card) throw new Error(`Could not find the card for program "${name}"`);
  fireEvent.click(within(card as HTMLElement).getByRole('button', { name: 'Start' }));
}

describe('Fit2Fit application', () => {
  beforeEach(async () => {
    const repository = new LocalStorageRepository(new MemoryStorage());
    setRepository(repository);

    // Seed the language before first run so the demo content is generated in
    // English, which keeps the assertions below readable.
    await repository.saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });

    useDataStore.setState({ status: 'idle' });
    useWorkoutStore.setState({ session: null, hydrated: false });

    // HashRouter reads the real location, which persists between tests.
    window.location.hash = '#/';
  });

  it('boots with demo data and shows the dashboard', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Fit2Fit' })).toBeInTheDocument();
    // The seeded weekly plan puts one of the demo programs up next.
    expect(await screen.findAllByText(/Workout [AB]|Intervals|Easy run/)).not.toHaveLength(0);
    expect(screen.getByText('This week')).toBeInTheDocument();
    // Three weeks of seeded history mean the charts and summaries have data.
    expect(useDataStore.getState().workoutSessions.length).toBeGreaterThan(0);
  });

  it('runs a full workout: start, log a set, finish, and record it in history', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Fit2Fit' });

    // Start from the programs tab so the choice of program is explicit rather
    // than dependent on which day the suite happens to run.
    await startProgram('Workout A');

    // Workout mode: the running timer and the exercise counter are on screen.
    expect(await screen.findByText('0/7 exercises')).toBeInTheDocument();
    expect(screen.getAllByText('00:00:00').length).toBeGreaterThan(0);

    const firstSetToggle = screen.getAllByRole('button', { name: 'Set 1' })[0]!;
    expect(firstSetToggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(firstSetToggle);
    await waitFor(() => expect(firstSetToggle).toHaveAttribute('aria-pressed', 'true'));

    // The completed set is persisted on the active session, so a refresh keeps it.
    const active = useWorkoutStore.getState().session;
    expect(active?.exercises[0]?.sets[0]?.completed).toBe(true);
    expect(active?.exercises[0]?.sets[0]?.actualReps).toBe(15);

    fireEvent.click(screen.getByRole('button', { name: /Finish workout/ }));

    // The overall effort rating is required before the workout can be saved.
    const saveButton = await screen.findByRole('button', { name: 'Save workout' });
    fireEvent.click(saveButton);
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
    await screen.findByRole('heading', { name: 'Fit2Fit' });

    await startProgram('Workout A');

    await screen.findByText('0/7 exercises');
    fireEvent.click(screen.getAllByRole('button', { name: 'Set 1' })[0]!);
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
      expect(restored?.exercises[0]?.sets[0]?.completed).toBe(true);
    });

    expect(await screen.findByText('Workout in progress')).toBeInTheDocument();
  });
});
