import { useState } from 'react';
import { Pencil, Play, Trash2 } from 'lucide-react';
import { Button, Card, IconButton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WorkoutProgram, WorkoutProgramExercise } from '@/models/program';
import { ExerciseDetailsSheet } from '@/features/exercises/ExerciseDetailsSheet';
import { detailsFromProgramRow } from '@/features/exercises/exerciseDetails';
import { useDataStore } from '@/store/useDataStore';
import { countProgramSets, estimateProgramMinutes } from '@/utils/analytics/session';
import { formatTarget } from '@/utils/format';

interface ProgramCardProps {
  program: WorkoutProgram;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  startDisabled: boolean;
}

/** Program summary with its exercise list and a one-tap start. */
export function ProgramCard({
  program,
  onStart,
  onEdit,
  onDelete,
  startDisabled,
}: ProgramCardProps) {
  const { t } = useTranslation();
  const exercises = useDataStore((state) => state.exercises);
  const settings = useDataStore((state) => state.settings);
  const [detailsRow, setDetailsRow] = useState<WorkoutProgramExercise | null>(null);

  const ordered = [...program.exercises].sort((a, b) => a.order - b.order);

  const details = detailsRow
    ? detailsFromProgramRow(
        detailsRow,
        exercises.find((exercise) => exercise.id === detailsRow.exerciseId),
        settings.defaultRestSeconds,
      )
    : null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{program.name}</h3>
          <p className="text-muted mt-0.5 text-xs">
            {t('programs.exerciseSummary', {
              exercises: program.exercises.length,
              sets: countProgramSets(program),
              minutes: estimateProgramMinutes(program),
            })}
          </p>
        </div>

        <div className="flex shrink-0">
          <IconButton size="sm" label={t('common.edit')} icon={<Pencil size={16} />} onClick={onEdit} />
          <IconButton
            size="sm"
            tone="danger"
            label={t('common.delete')}
            icon={<Trash2 size={16} />}
            onClick={onDelete}
          />
        </div>
      </div>

      {ordered.length > 0 ? (
        <ul className="border-line mt-3 flex flex-col gap-1 border-t pt-3">
          {ordered.map((row) => {
            const exercise = exercises.find((item) => item.id === row.exerciseId);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setDetailsRow(row)}
                  className="hover:bg-elevated -mx-1.5 flex w-[calc(100%+0.75rem)] items-baseline justify-between gap-3 rounded-lg px-1.5 py-0.5 text-start text-sm transition-colors"
                >
                  <span className="truncate">{exercise?.name ?? '—'}</span>
                  <span dir="ltr" className="text-muted shrink-0 text-xs tabular-nums">
                    {formatTarget(row.plannedSets, row.plannedReps, row.plannedDurationSeconds, t)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Button
        fullWidth
        className="mt-4"
        icon={<Play size={17} />}
        disabled={startDisabled || ordered.length === 0}
        onClick={onStart}
      >
        {t('programs.start')}
      </Button>

      <ExerciseDetailsSheet
        open={details !== null}
        details={details}
        weightUnit={settings.weightUnit}
        onClose={() => setDetailsRow(null)}
      />
    </Card>
  );
}
