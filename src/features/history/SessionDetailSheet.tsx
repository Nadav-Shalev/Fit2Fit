import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, Sheet } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { ExerciseSession } from '@/models/session';
import { ACTIVITY_LABEL } from '@/features/running/cardioActivity';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { cardioActivityOf } from '@/utils/analytics/running';
import { calcSessionTotalReps, calcSessionVolume, countCompletedSets, countPlannedSets } from '@/utils/analytics/volume';
import { formatFullDate, formatTime, parseCalendarDate } from '@/utils/date';
import {
  formatDistance,
  formatDurationHuman,
  formatPaceWithUnit,
  formatTarget,
  formatWeight,
} from '@/utils/format';
import type { HistoryEntry } from './historyEntries';

interface SessionDetailSheetProps {
  entry: HistoryEntry | null;
  onClose: () => void;
}

function SummaryGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-elevated rounded-xl p-3">
          <p className="text-muted text-xs">{item.label}</p>
          <p className="mt-1 font-bold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/** Read-only breakdown of one exercise as it was performed. */
function ExerciseBreakdown({ exercise }: { exercise: ExerciseSession }) {
  const { t } = useTranslation();
  const weightUnit = useDataStore((state) => state.settings.weightUnit);
  const completed = exercise.sets.filter((set) => set.completed);

  return (
    <div className="border-line border-b py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate font-semibold">{exercise.exerciseName}</p>
        {exercise.status === 'skipped' ? (
          <Badge tone="warning">{t('workout.skipped')}</Badge>
        ) : (
          <span className="text-muted shrink-0 text-xs">
            {formatTarget(
              exercise.planned.sets,
              exercise.planned.reps,
              exercise.planned.durationSeconds,
              t,
            )}
          </span>
        )}
      </div>

      {completed.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {completed.map((set) => (
            <span
              key={set.id}
              className="bg-elevated rounded-lg px-2 py-1 text-xs font-medium tabular-nums"
            >
              {exercise.isTimed
                ? `${set.actualDurationSeconds ?? 0} ${t('units.sec')}`
                : exercise.isWeighted && set.actualWeightKg
                  ? `${formatWeight(set.actualWeightKg, weightUnit, t)} × ${set.actualReps ?? 0}`
                  : (set.actualReps ?? 0)}
            </span>
          ))}
        </div>
      ) : null}

      {exercise.rpe ? (
        <p className="text-muted mt-2 text-xs">
          {t('rpe.label')} {exercise.rpe}
        </p>
      ) : null}
      {exercise.notes ? <p className="text-muted mt-1 text-xs italic">{exercise.notes}</p> : null}
    </div>
  );
}

/** Full detail view for a history entry, with the option to delete it. */
export function SessionDetailSheet({ entry, onClose }: SessionDetailSheetProps) {
  const { t, language } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteWorkout = useDataStore((state) => state.deleteWorkoutSession);
  const deleteRun = useDataStore((state) => state.deleteRunningSession);
  const pushToast = useToastStore((state) => state.push);

  if (!entry) return null;

  const date = parseCalendarDate(entry.date);
  const startTime = formatTime(new Date(entry.session.startedAt), language);
  const endTime = entry.session.endedAt ? formatTime(new Date(entry.session.endedAt), language) : null;

  const handleDelete = async () => {
    if (entry.kind === 'strength') await deleteWorkout(entry.session.id);
    else await deleteRun(entry.session.id);
    setConfirmDelete(false);
    pushToast(t('common.delete'), 'info');
    onClose();
  };

  const summaryItems =
    entry.kind === 'strength'
      ? [
          {
            label: t('workout.summaryDuration'),
            value: formatDurationHuman(entry.session.durationSeconds, t),
          },
          {
            label: t('workout.summarySets'),
            value: `${countCompletedSets(entry.session)}/${countPlannedSets(entry.session)}`,
          },
          { label: t('workout.summaryReps'), value: String(calcSessionTotalReps(entry.session)) },
          {
            label: t('rpe.label'),
            value: entry.session.rpe ? `${entry.session.rpe}/10` : '—',
          },
        ]
      : [
          {
            label: t('running.activity'),
            value: t(ACTIVITY_LABEL[cardioActivityOf(entry.session)]),
          },
          {
            label: t('running.duration'),
            value: formatDurationHuman(entry.session.durationSeconds, t),
          },
          { label: t('running.distance'), value: formatDistance(entry.session.distanceKm, t) },
          { label: t('running.pace'), value: formatPaceWithUnit(entry.session.paceSecondsPerKm, t) },
        ];

  const volume = entry.kind === 'strength' ? calcSessionVolume(entry.session) : 0;

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        size="lg"
        title={
          entry.session.programName ||
          (entry.kind === 'running'
            ? t(ACTIVITY_LABEL[cardioActivityOf(entry.session)])
            : t('workout.title'))
        }
        description={`${formatFullDate(date, language)} · ${
          endTime ? t('history.startEnd', { start: startTime, end: endTime }) : startTime
        }`}
        footer={
          <Button
            variant="danger"
            fullWidth
            icon={<Trash2 size={17} />}
            onClick={() => setConfirmDelete(true)}
          >
            {t('common.delete')}
          </Button>
        }
      >
        <SummaryGrid items={summaryItems} />

        {volume > 0 ? (
          <p className="text-muted mt-3 text-sm">
            {t('workout.summaryVolume')}: <span className="font-bold">{volume.toLocaleString()}</span>{' '}
            {t('units.kg')}
          </p>
        ) : null}

        {entry.kind === 'strength' ? (
          <div className="mt-4">
            {entry.session.exercises.map((exercise) => (
              <ExerciseBreakdown key={exercise.id} exercise={exercise} />
            ))}
          </div>
        ) : null}

        <div className="mt-4">
          <p className="text-muted mb-1 text-xs font-semibold">{t('common.notes')}</p>
          <p className="text-sm">{entry.session.notes || t('history.noNotes')}</p>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title={entry.kind === 'strength' ? t('history.deleteTitle') : t('running.deleteRunTitle')}
        body={entry.kind === 'strength' ? t('history.deleteBody') : t('running.deleteRunBody')}
        confirmLabel={t('common.delete')}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
