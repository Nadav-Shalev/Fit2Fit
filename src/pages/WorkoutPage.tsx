import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, PageHeader } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useTicker } from '@/hooks/useTicker';
import type { ExerciseSession, WorkoutSession } from '@/models/session';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { FinishWorkoutSheet } from '@/features/workout/FinishWorkoutSheet';
import { RestTimerBar } from '@/features/workout/RestTimerBar';
import { WorkoutPicker } from '@/features/workout/WorkoutPicker';
import { findPreviousExercisePerformance } from '@/utils/analytics/progression';
import { calcSessionProgress } from '@/utils/analytics/session';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { formatDuration } from '@/utils/format';

/** Sticky bar with the workout name, running timer and exercise progress. */
function WorkoutHeader({ session }: { session: WorkoutSession }) {
  const { t } = useTranslation();
  const now = useTicker(true);
  const progress = calcSessionProgress(session);
  const elapsed = Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));

  return (
    <div className="bg-bg/95 border-line sticky top-14 z-20 -mx-4 mb-4 border-b px-4 py-3 backdrop-blur">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-lg font-extrabold">{session.programName}</h1>
        <span className="text-primary shrink-0 text-xl font-bold tabular-nums">
          {formatDuration(elapsed)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="bg-elevated h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <span className="text-muted shrink-0 text-xs font-medium tabular-nums">
          {t('workout.exercisesProgress', {
            done: progress.completedExercises,
            total: progress.totalExercises,
          })}
        </span>
      </div>
    </div>
  );
}

/**
 * Workout mode: one scrollable screen holding every exercise, with the timer
 * pinned at the top and the finish action pinned at the bottom, so nothing about
 * logging a set requires navigating away.
 */
export function WorkoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);

  const session = useWorkoutStore((state) => state.session);
  const updateSetValue = useWorkoutStore((state) => state.updateSetValue);
  const toggleSet = useWorkoutStore((state) => state.toggleSet);
  const appendSet = useWorkoutStore((state) => state.appendSet);
  const dropLastSet = useWorkoutStore((state) => state.dropLastSet);
  const updateExerciseNotes = useWorkoutStore((state) => state.updateExerciseNotes);
  const updateExerciseRpe = useWorkoutStore((state) => state.updateExerciseRpe);
  const toggleSkip = useWorkoutStore((state) => state.toggleSkip);
  const finish = useWorkoutStore((state) => state.finish);
  const discard = useWorkoutStore((state) => state.discard);

  const workoutSessions = useDataStore((state) => state.workoutSessions);
  const settings = useDataStore((state) => state.settings);

  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // Warn on refresh; the session itself is already persisted either way.
  useBeforeUnload(session !== null);

  // Look up the previous performance of every exercise once per render pass
  // rather than scanning history inside each card.
  const previousByExerciseId = useMemo(() => {
    const map = new Map<string, ExerciseSession | null>();
    if (!session) return map;
    for (const exercise of session.exercises) {
      if (map.has(exercise.exerciseId)) continue;
      const found = findPreviousExercisePerformance(
        workoutSessions,
        exercise.exerciseId,
        session.id,
      );
      map.set(exercise.exerciseId, found?.exercise ?? null);
    }
    return map;
  }, [session, workoutSessions]);

  if (!session) {
    return (
      <div className="py-2">
        <PageHeader title={t('workout.title')} />
        <WorkoutPicker />
      </div>
    );
  }

  const handleFinish = async (rpe: number, notes: string) => {
    const finished = await finish(rpe, notes);
    setFinishOpen(false);
    if (finished) {
      pushToast(t('workout.saved'));
      navigate('/history');
    }
  };

  const handleDiscard = async () => {
    await discard();
    setDiscardOpen(false);
    navigate('/');
  };

  return (
    <div className="pb-44">
      <WorkoutHeader session={session} />

      <div className="flex flex-col gap-3">
        {session.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            previous={previousByExerciseId.get(exercise.exerciseId) ?? null}
            weightUnit={settings.weightUnit}
            showPrevious={settings.showPreviousPerformance}
            onSetChange={(setId, patch) => updateSetValue(exercise.id, setId, patch)}
            onToggleSet={(setId) => toggleSet(exercise.id, setId, exercise.planned.restSeconds)}
            onAddSet={() => appendSet(exercise.id)}
            onRemoveSet={() => dropLastSet(exercise.id)}
            onNotesChange={(notes) => updateExerciseNotes(exercise.id, notes)}
            onRpeChange={(rpe) => updateExerciseRpe(exercise.id, rpe)}
            onToggleSkip={() => toggleSkip(exercise.id)}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        fullWidth
        className="mt-4"
        icon={<Trash2 size={16} />}
        onClick={() => setDiscardOpen(true)}
      >
        {t('workout.discard')}
      </Button>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 lg:bottom-0 lg:ps-60">
        <div className="from-bg via-bg mx-auto max-w-3xl bg-gradient-to-t to-transparent px-4 pt-4 pb-3">
          <div className="mb-2">
            <RestTimerBar />
          </div>
          <Button size="lg" fullWidth icon={<Flag size={20} />} onClick={() => setFinishOpen(true)}>
            {t('workout.finish')}
          </Button>
        </div>
      </div>

      {finishOpen ? (
        <FinishWorkoutSheet
          open
          session={session}
          onClose={() => setFinishOpen(false)}
          onFinish={(rpe, notes) => void handleFinish(rpe, notes)}
        />
      ) : null}

      <ConfirmDialog
        open={discardOpen}
        title={t('workout.discardTitle')}
        body={t('workout.discardBody')}
        confirmLabel={t('workout.discard')}
        onConfirm={() => void handleDiscard()}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}
