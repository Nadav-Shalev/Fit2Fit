import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { DEFAULT_SETTINGS } from '@/models/settings';
import { LocalStorageRepository, setRepository } from '@/repositories';
import { MemoryStorage } from '@/repositories/storageDriver';
import { useDataStore } from '@/store/useDataStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';

/**
 * The flows around the workout itself: logging cardio, reading progress,
 * personalising the greeting and inspecting an exercise.
 *
 * `App.test.tsx` covers the guided workout end to end; these cover the pages it
 * never visits, which is where a broken import or a bad translation key would
 * otherwise go unnoticed until runtime.
 */
/** Sidebar and bottom bar both render every link, so navigation matches twice. */
function navigateTo(label: string): void {
  fireEvent.click(screen.getAllByRole('link', { name: label })[0]!);
}

const GREETING = /Good (morning|afternoon|evening)/;

describe('Fit2Fit flows', () => {
  beforeEach(async () => {
    const repository = new LocalStorageRepository(new MemoryStorage());
    setRepository(repository);
    await repository.saveSettings({ ...DEFAULT_SETTINGS, language: 'en' });
    useDataStore.setState({ status: 'idle' });
    useWorkoutStore.setState({ session: null, hydrated: false });
    window.location.hash = '#/';
  });

  it('cardio page: log a walk and keep existing runs visible', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: GREETING });

    navigateTo('Cardio');
    expect(await screen.findByRole('heading', { name: 'Cardio' })).toBeInTheDocument();

    const beforeCount = useDataStore.getState().runningSessions.length;
    expect(beforeCount).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Log activity' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Walking' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save activity' }));

    await screen.findByText(/Walking/);
    const sessions = useDataStore.getState().runningSessions;
    expect(sessions.length).toBe(beforeCount + 1);
    expect(sessions.some((s) => s.activity === 'walk')).toBe(true);
    // Pre-existing runs are untouched and still read as runs.
    expect(sessions.filter((s) => (s.activity ?? 'run') === 'run').length).toBe(beforeCount);
  });

  it('progress page renders all three tabs', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: GREETING });

    navigateTo('Progress');
    expect(await screen.findByText('Per workout', undefined, { timeout: 5000 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Cardio' }));
    expect(await screen.findByText('Distance per session')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Summary' }));
    expect(await screen.findByText('Weekly summary')).toBeInTheDocument();
  });

  it('settings page stores a user name that reaches the greeting', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: GREETING });

    navigateTo('Settings');
    const field = await screen.findByLabelText('Your name');
    fireEvent.change(field, { target: { value: 'Nadav' } });

    await screen.findByDisplayValue('Nadav');
    navigateTo('Home');
    expect(
      await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Nadav/ }),
    ).toBeInTheDocument();
  });

  it('programs page opens exercise details with a safe video action', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: GREETING });

    navigateTo('Programs');
    const heading = await screen.findByRole('heading', { name: 'Workout A' });
    const card = heading.closest('div.bg-surface') as HTMLElement;

    fireEvent.click(within(card).getByRole('button', { name: /Push Ups/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Planned targets')).toBeInTheDocument();
    expect(within(dialog).getByText('Rest between sets')).toBeInTheDocument();
    // The demo links are YouTube searches, so they open externally rather than embed.
    expect(within(dialog).getByRole('button', { name: 'Watch video' })).toBeInTheDocument();
    expect(within(dialog).queryByTitle('Exercise demonstration')).toBeNull();
  });
});
