import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import {
  Button,
  NumberStepper,
  SelectField,
  Sheet,
  TextAreaField,
  TextField,
  Toggle,
} from '@/components/ui';
import { FieldShell } from '@/components/ui/Field';
import { useTranslation } from '@/i18n';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/models/common';
import type { Exercise } from '@/models/exercise';
import type { WorkoutProgramExercise } from '@/models/program';
import { useDataStore } from '@/store/useDataStore';
import { createId } from '@/utils/id';

interface ExerciseEditorSheetProps {
  open: boolean;
  onClose: () => void;
  /** Existing row when editing, `null` when adding a new one. */
  row: WorkoutProgramExercise | null;
  onSave: (row: WorkoutProgramExercise) => void;
}

interface ExerciseDraft {
  id: string;
  name: string;
  nameEn: string;
  category: MuscleGroup;
  isWeighted: boolean;
  isTimed: boolean;
  videoUrl: string;
  defaultRestSeconds: number;
  isNew: boolean;
}

interface RowDraft {
  sets: number;
  repsMin: number | undefined;
  repsMax: number | undefined;
  durationSeconds: number | undefined;
  rirMin: number | undefined;
  rirMax: number | undefined;
  restSeconds: number;
  targetWeightKg: number | undefined;
  notes: string;
}

function draftFromExercise(exercise: Exercise): ExerciseDraft {
  return {
    id: exercise.id,
    name: exercise.name,
    nameEn: exercise.nameEn ?? '',
    category: exercise.category,
    isWeighted: exercise.isWeighted,
    isTimed: exercise.isTimed,
    videoUrl: exercise.videoUrl ?? '',
    defaultRestSeconds: exercise.defaultRestSeconds,
    isNew: false,
  };
}

function emptyDraft(defaultRest: number): ExerciseDraft {
  return {
    id: createId(),
    name: '',
    nameEn: '',
    category: 'fullBody',
    isWeighted: false,
    isTimed: false,
    videoUrl: '',
    defaultRestSeconds: defaultRest,
    isNew: true,
  };
}

function rowDraftFrom(row: WorkoutProgramExercise | null, restSeconds: number): RowDraft {
  return {
    sets: row?.plannedSets ?? 3,
    repsMin: row?.plannedReps?.min ?? 10,
    repsMax: row?.plannedReps?.max,
    durationSeconds: row?.plannedDurationSeconds,
    rirMin: row?.plannedRir?.min,
    rirMax: row?.plannedRir?.max,
    restSeconds: row?.restSeconds ?? restSeconds,
    targetWeightKg: row?.targetWeightKg,
    notes: row?.notes ?? '',
  };
}

/**
 * Adds or edits one exercise inside a program.
 *
 * Because there is no separate library screen, this sheet doubles as the place
 * where catalog exercises are created and maintained: pick an existing one, or
 * define a new one inline.
 */
export function ExerciseEditorSheet({ open, onClose, row, onSave }: ExerciseEditorSheetProps) {
  const { t } = useTranslation();
  const exercises = useDataStore((state) => state.exercises);
  const saveExercise = useDataStore((state) => state.saveExercise);
  const defaultRest = useDataStore((state) => state.settings.defaultRestSeconds);
  const weightUnit = useDataStore((state) => state.settings.weightUnit);

  const existing = row ? exercises.find((item) => item.id === row.exerciseId) : undefined;

  const [stage, setStage] = useState<'pick' | 'edit'>(row ? 'edit' : 'pick');
  const [query, setQuery] = useState('');
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseDraft>(() =>
    existing ? draftFromExercise(existing) : emptyDraft(defaultRest),
  );
  const [rowDraft, setRowDraft] = useState<RowDraft>(() =>
    rowDraftFrom(row, existing?.defaultRestSeconds ?? defaultRest),
  );
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return exercises;
    return exercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(needle) ||
        (exercise.nameEn ?? '').toLowerCase().includes(needle),
    );
  }, [exercises, query]);

  const choose = (exercise: Exercise) => {
    setExerciseDraft(draftFromExercise(exercise));
    setRowDraft(rowDraftFrom(null, exercise.defaultRestSeconds));
    if (exercise.isTimed) {
      setRowDraft((current) => ({ ...current, durationSeconds: 45, repsMin: undefined }));
    }
    setStage('edit');
  };

  const startNew = () => {
    setExerciseDraft(emptyDraft(defaultRest));
    setRowDraft(rowDraftFrom(null, defaultRest));
    setStage('edit');
  };

  const handleSave = async () => {
    if (!exerciseDraft.name.trim()) {
      setError(t('exercise.nameRequired'));
      return;
    }

    const now = new Date().toISOString();
    const exercise: Exercise = {
      id: exerciseDraft.id,
      name: exerciseDraft.name.trim(),
      category: exerciseDraft.category,
      isWeighted: exerciseDraft.isWeighted,
      isTimed: exerciseDraft.isTimed,
      defaultRestSeconds: exerciseDraft.defaultRestSeconds,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (exerciseDraft.nameEn.trim()) exercise.nameEn = exerciseDraft.nameEn.trim();
    if (exerciseDraft.videoUrl.trim()) exercise.videoUrl = exerciseDraft.videoUrl.trim();
    await saveExercise(exercise);

    const result: WorkoutProgramExercise = {
      id: row?.id ?? createId(),
      exerciseId: exercise.id,
      order: row?.order ?? 0,
      plannedSets: Math.max(1, rowDraft.sets),
      plannedReps: exerciseDraft.isTimed
        ? null
        : {
            min: rowDraft.repsMin ?? 1,
            ...(rowDraft.repsMax !== undefined && rowDraft.repsMax > (rowDraft.repsMin ?? 0)
              ? { max: rowDraft.repsMax }
              : {}),
          },
      restSeconds: rowDraft.restSeconds,
    };
    if (exerciseDraft.isTimed) result.plannedDurationSeconds = rowDraft.durationSeconds ?? 45;
    if (rowDraft.rirMin !== undefined) {
      result.plannedRir = {
        min: rowDraft.rirMin,
        ...(rowDraft.rirMax !== undefined && rowDraft.rirMax > rowDraft.rirMin
          ? { max: rowDraft.rirMax }
          : {}),
      };
    }
    if (exerciseDraft.isWeighted && rowDraft.targetWeightKg !== undefined) {
      result.targetWeightKg = rowDraft.targetWeightKg;
    }
    if (rowDraft.notes.trim()) result.notes = rowDraft.notes.trim();

    onSave(result);
    onClose();
  };

  if (stage === 'pick') {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={t('programs.addExercise')}
        footer={
          <Button fullWidth variant="secondary" icon={<Plus size={18} />} onClick={startNew}>
            {t('exercise.newExercise')}
          </Button>
        }
      >
        <div className="relative mb-3">
          <Search
            size={17}
            className="text-muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('exercise.searchPlaceholder')}
            className="bg-elevated border-line placeholder:text-muted/60 h-11 w-full rounded-xl border ps-10 pe-3 focus:border-primary focus:outline-none"
          />
        </div>

        {exercises.length === 0 ? (
          <p className="text-muted py-6 text-center text-sm">{t('exercise.libraryEmpty')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted py-6 text-center text-sm">{t('exercise.noMatches')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {filtered.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => choose(exercise)}
                  className="bg-elevated hover:bg-surface border-line w-full rounded-xl border px-3.5 py-3 text-start transition-colors"
                >
                  <span className="block font-semibold">{exercise.name}</span>
                  {exercise.nameEn ? (
                    <span className="text-muted block text-xs">{exercise.nameEn}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={row ? t('common.edit') : t('exercise.addToProgram')}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button fullWidth onClick={() => void handleSave()}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label={t('exercise.name')}
          placeholder={t('exercise.namePlaceholder')}
          value={exerciseDraft.name}
          error={error}
          onChange={(event) => {
            setExerciseDraft({ ...exerciseDraft, name: event.target.value });
            setError(null);
          }}
        />

        <TextField
          label={`${t('exercise.nameEn')} (${t('common.optional')})`}
          placeholder={t('exercise.nameEnPlaceholder')}
          value={exerciseDraft.nameEn}
          onChange={(event) => setExerciseDraft({ ...exerciseDraft, nameEn: event.target.value })}
        />

        <SelectField
          label={t('exercise.category')}
          value={exerciseDraft.category}
          onChange={(event) =>
            setExerciseDraft({ ...exerciseDraft, category: event.target.value as MuscleGroup })
          }
        >
          {MUSCLE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {t(`muscle.${group}`)}
            </option>
          ))}
        </SelectField>

        <div className="border-line flex flex-col gap-3 rounded-xl border p-3">
          <Toggle
            checked={exerciseDraft.isWeighted}
            onChange={(checked) => setExerciseDraft({ ...exerciseDraft, isWeighted: checked })}
            label={t('exercise.weighted')}
            hint={t('exercise.weightedHint')}
          />
          <Toggle
            checked={exerciseDraft.isTimed}
            onChange={(checked) => {
              setExerciseDraft({ ...exerciseDraft, isTimed: checked });
              setRowDraft((current) => ({
                ...current,
                durationSeconds: checked ? (current.durationSeconds ?? 45) : undefined,
              }));
            }}
            label={t('exercise.timed')}
            hint={t('exercise.timedHint')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldShell label={t('exercise.sets')}>
            <NumberStepper
              value={rowDraft.sets}
              onChange={(value) => setRowDraft({ ...rowDraft, sets: value ?? 1 })}
              label={t('exercise.sets')}
              min={1}
              max={20}
            />
          </FieldShell>

          {exerciseDraft.isTimed ? (
            <FieldShell label={`${t('exercise.duration')} (${t('units.sec')})`}>
              <NumberStepper
                value={rowDraft.durationSeconds}
                onChange={(value) => setRowDraft({ ...rowDraft, durationSeconds: value })}
                label={t('exercise.duration')}
                step={5}
                max={900}
              />
            </FieldShell>
          ) : (
            <FieldShell label={t('exercise.reps')}>
              <NumberStepper
                value={rowDraft.repsMin}
                onChange={(value) => setRowDraft({ ...rowDraft, repsMin: value })}
                label={t('exercise.reps')}
                max={500}
              />
            </FieldShell>
          )}
        </div>

        {!exerciseDraft.isTimed ? (
          <FieldShell label={t('exercise.repsMax')} hint={t('exercise.repsRangeHint')}>
            <NumberStepper
              value={rowDraft.repsMax}
              onChange={(value) => setRowDraft({ ...rowDraft, repsMax: value })}
              label={t('exercise.repsMax')}
              max={500}
            />
          </FieldShell>
        ) : null}

        {exerciseDraft.isWeighted ? (
          <FieldShell label={`${t('exercise.targetWeight')} (${t(`units.${weightUnit}`)})`}>
            <NumberStepper
              value={rowDraft.targetWeightKg}
              onChange={(value) => setRowDraft({ ...rowDraft, targetWeightKg: value })}
              label={t('exercise.targetWeight')}
              step={2.5}
              max={999}
            />
          </FieldShell>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <FieldShell label={t('exercise.rir')} hint={t('exercise.rirHint')}>
            <NumberStepper
              value={rowDraft.rirMin}
              onChange={(value) => setRowDraft({ ...rowDraft, rirMin: value })}
              label={t('exercise.rir')}
              max={10}
            />
          </FieldShell>

          <FieldShell label={`${t('exercise.rest')} (${t('units.sec')})`}>
            <NumberStepper
              value={rowDraft.restSeconds}
              onChange={(value) => setRowDraft({ ...rowDraft, restSeconds: value ?? 0 })}
              label={t('exercise.rest')}
              step={15}
              max={900}
            />
          </FieldShell>
        </div>

        <TextField
          label={`${t('exercise.video')} (${t('common.optional')})`}
          placeholder={t('exercise.videoPlaceholder')}
          type="url"
          dir="ltr"
          value={exerciseDraft.videoUrl}
          onChange={(event) => setExerciseDraft({ ...exerciseDraft, videoUrl: event.target.value })}
        />

        <TextAreaField
          label={`${t('exercise.notes')} (${t('common.optional')})`}
          placeholder={t('exercise.notesPlaceholder')}
          value={rowDraft.notes}
          onChange={(event) => setRowDraft({ ...rowDraft, notes: event.target.value })}
        />
      </div>
    </Sheet>
  );
}
