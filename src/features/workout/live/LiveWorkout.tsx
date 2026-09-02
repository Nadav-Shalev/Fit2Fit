import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { ConfirmDialog, IconButton, Sheet } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useTicker } from '@/hooks/useTicker';
import type { ExerciseSession, WorkoutSession } from '@/models/session';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { FinishWorkoutSheet } from '@/features/workout/FinishWorkoutSheet';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { findPreviousExercisePerformance } from '@/utils/analytics/progression';
import { calcSessionProgress } from '@/utils/analytics/session';
import { formatDuration } from '@/utils/format';
import { ActiveSet } from './ActiveSet';
import { CountdownOverlay } from './CountdownOverlay';
import { ExercisePrep } from './ExercisePrep';
import { RestScreen } from './RestScreen';
import { WorkoutChecklist } from './WorkoutChecklist';
import { WorkoutSummary } from './WorkoutSummary';

/** Workout name, elapsed time, progress and the one way out. */
function LiveHeader({ session, onExit }: { session: WorkoutSession; onExit: () => void }) {
  const { t } = useTranslation();
  const now = useTicker(true);
  const progress = calcSessionProgress(session);
  const elapsed = Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));

  return (
    <header className="safe-top border-line shrink-0 border-b px-4 pt-3 pb-2.5">
      <div className="flex items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold">{session.programName}</h1>
        <span dir="ltr" className="text-primary shrink-0 font-bold tabular-nums">
          {formatDuration(elapsed)}
        </span>
        <IconButton size="sm" label={t('common.close')} icon={<X size={20} />} onClick={onExit} />
      </div>

      <div className="bg-elevated mt-2 h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </header>
  );
}

/**
 * Guided workout mode.
 *
 * A full-screen layer above the app chrome, holding one state at a time:
 * the exercise checklist, then prepare → countdown → set → rest for each set,
 * and a completion summary at the end. Leaving is always possible and never
 * destructive — the session keeps running and is resumable from the home screen.
 */
export function LiveWorkout({ session }: { session: WorkoutSession }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);

  const live = useWorkoutStore((state) => state.live);
  const openExercise = useWorkoutStore((state) => state.openExercise);
  const beginCountdown = useWorkoutStore((state) => state.beginCountdown);
  const beginSet = useWorkoutStore((state) => state.beginSet);
  const pauseSet = useWorkoutStore((state) => state.pauseSet);
  const resumeSet = useWorkoutStore((state) => state.resumeSet);
  const finishSet = useWorkoutStore((state) => state.finishSet);
  const endRestAndPrepareNext = useWorkoutStore((state) => state.endRestAndPrepareNext);
  const backToOverview = useWorkoutStore((state) => state.backToOverview);
  const openSummary = useWorkoutStore((state) => state.openSummary);

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

  const [reviewing, setReviewing] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  // Warns on refresh; the session itself is persisted either way.
  useBeforeUnload(true);

  const exercise = session.exercises.find((item) => item.id === live.exerciseSessionId) ?? null;
  const setIndex = exercise
    ? exercise.sets.findIndex((item) => item.id === live.setId) + 1
    : 0;

  const reviewed = session.exercises.find((item) => item.id === reviewing) ?? null;
  const previous = useMemo<ExerciseSession | null>(() => {
    if (!reviewed) return null;
    return (
      findPreviousExercisePerformance(workoutSessions, reviewed.exerciseId, session.id)?.exercise ??
      null
    );
  }, [reviewed, workoutSessions, session.id]);

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

  // A phase that lost its exercise (or its set) falls back to the checklist
  // rather than rendering a broken screen.
  const phase = exercise && setIndex > 0 ? live.phase : live.phase === 'summary' ? 'summary' : 'overview';

  return (
    <div className="bg-bg fixed inset-0 z-50 flex flex-col">
      <LiveHeader session={session} onExit={() => setExitOpen(true)} />

      {phase === 'overview' ? (
        <WorkoutChecklist
          session={session}
          onStart={openExercise}
          onReview={(item) => setReviewing(item.id)}
          onFinish={openSummary}
          onDiscard={() => setDiscardOpen(true)}
        />
      ) : null}

      {phase === 'ready' && exercise ? (
        <ExercisePrep
          exercise={exercise}
          setIndex={setIndex}
          weightUnit={settings.weightUnit}
          onStart={beginCountdown}
          onBack={backToOverview}
        />
      ) : null}

      {phase === 'countdown' && live.countdownEndsAt !== null ? (
        <CountdownOverlay endsAt={live.countdownEndsAt} onComplete={beginSet} />
      ) : null}

      {phase === 'active' && exercise ? (
        <ActiveSet
          key={live.setId}
          exercise={exercise}
          setIndex={setIndex}
          weightUnit={settings.weightUnit}
          startedAt={live.startedAt}
          pausedAt={live.pausedAt}
          pausedMs={live.pausedMs}
          onPause={pauseSet}
          onResume={resumeSet}
          onFinish={finishSet}
        />
      ) : null}

      {phase === 'rest' && exercise ? (
        <RestScreen
          exercise={exercise}
          completedSetIndex={Math.max(1, setIndex - 1)}
          nextSetIndex={setIndex}
          onNext={endRestAndPrepareNext}
        />
      ) : null}

      {phase === 'summary' ? (
        <WorkoutSummary
          session={session}
          onFinish={() => setFinishOpen(true)}
          onBack={backToOverview}
        />
      ) : null}

      {/* Everything the focused screens leave out — per-set values, notes,
          per-exercise effort, skipping — stays reachable from here. */}
      {reviewed ? (
        <Sheet
          open
          onClose={() => setReviewing(null)}
          size="lg"
          title={reviewed.exerciseName}
        >
          <ExerciseCard
            exercise={reviewed}
            previous={previous}
            weightUnit={settings.weightUnit}
            showPrevious={settings.showPreviousPerformance}
            onSetChange={(setId, patch) => updateSetValue(reviewed.id, setId, patch)}
            onToggleSet={(setId) => toggleSet(reviewed.id, setId)}
            onAddSet={() => appendSet(reviewed.id)}
            onRemoveSet={() => dropLastSet(reviewed.id)}
            onNotesChange={(notes) => updateExerciseNotes(reviewed.id, notes)}
            onRpeChange={(rpe) => updateExerciseRpe(reviewed.id, rpe)}
            onToggleSkip={() => toggleSkip(reviewed.id)}
          />
        </Sheet>
      ) : null}

      {finishOpen ? (
        <FinishWorkoutSheet
          open
          session={session}
          onClose={() => setFinishOpen(false)}
          onFinish={(rpe, notes) => void handleFinish(rpe, notes)}
        />
      ) : null}

      <ConfirmDialog
        open={exitOpen}
        tone="primary"
        title={t('workout.leaveTitle')}
        body={t('workout.leaveBody')}
        confirmLabel={t('workout.leaveConfirm')}
        cancelLabel={t('workout.stay')}
        onConfirm={() => {
          setExitOpen(false);
          // Park the workout on its checklist so coming back through the resume
          // banner does not land mid-set on a stopwatch that kept running.
          backToOverview();
          navigate('/');
        }}
        onCancel={() => setExitOpen(false)}
      />

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
