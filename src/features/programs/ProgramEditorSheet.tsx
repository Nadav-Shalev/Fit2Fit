import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, IconButton, Sheet, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WorkoutProgram, WorkoutProgramExercise } from '@/models/program';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { formatTarget } from '@/utils/format';
import { createId } from '@/utils/id';
import { ExerciseEditorSheet } from './ExerciseEditorSheet';

interface ProgramEditorSheetProps {
  open: boolean;
  onClose: () => void;
  /** Existing program when editing, `null` when creating. */
  program: WorkoutProgram | null;
}

/** Moves an item within an array, returning a new array. */
function move<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  if (item) next.splice(target, 0, item);
  return next;
}

/** Creates or edits a program: its name and its ordered list of exercises. */
export function ProgramEditorSheet({ open, onClose, program }: ProgramEditorSheetProps) {
  const { t } = useTranslation();
  const exercises = useDataStore((state) => state.exercises);
  const saveProgram = useDataStore((state) => state.saveProgram);
  const pushToast = useToastStore((state) => state.push);

  const [name, setName] = useState(program?.name ?? '');
  const [description, setDescription] = useState(program?.description ?? '');
  const [rows, setRows] = useState<WorkoutProgramExercise[]>(
    () => [...(program?.exercises ?? [])].sort((a, b) => a.order - b.order),
  );
  const [editingRow, setEditingRow] = useState<WorkoutProgramExercise | null>(null);
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (row: WorkoutProgramExercise) =>
    exercises.find((exercise) => exercise.id === row.exerciseId)?.name ?? row.exerciseId;

  const upsertRow = (row: WorkoutProgramExercise) => {
    setRows((current) => {
      const index = current.findIndex((item) => item.id === row.id);
      if (index === -1) return [...current, { ...row, order: current.length }];
      return current.map((item, position) => (position === index ? row : item));
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('programs.nameRequired'));
      return;
    }

    const now = new Date().toISOString();
    const saved: WorkoutProgram = {
      id: program?.id ?? createId(),
      name: name.trim(),
      exercises: rows.map((row, index) => ({ ...row, order: index })),
      createdAt: program?.createdAt ?? now,
      updatedAt: now,
    };
    if (description.trim()) saved.description = description.trim();

    await saveProgram(saved);
    pushToast(t('common.save'));
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        size="lg"
        title={program ? t('programs.edit') : t('programs.new')}
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
            label={t('common.name')}
            placeholder={t('programs.namePlaceholder')}
            value={name}
            error={error}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />

          <TextField
            label={`${t('common.description')} (${t('common.optional')})`}
            placeholder={t('programs.descriptionPlaceholder')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">{t('programs.exercises')}</h3>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setEditingRow(null);
                  setExerciseSheetOpen(true);
                }}
              >
                {t('common.add')}
              </Button>
            </div>

            {rows.length === 0 ? (
              <EmptyState
                title={t('programs.noExercises')}
                description={t('programs.noExercisesHint')}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((row, index) => (
                  <li
                    key={row.id}
                    className="bg-elevated border-line flex items-center gap-2 rounded-xl border p-2.5"
                  >
                    <div className="flex flex-col">
                      <IconButton
                        size="sm"
                        label={t('common.moveUp')}
                        icon={<ArrowUp size={15} />}
                        disabled={index === 0}
                        onClick={() => setRows(move(rows, index, -1))}
                      />
                      <IconButton
                        size="sm"
                        label={t('common.moveDown')}
                        icon={<ArrowDown size={15} />}
                        disabled={index === rows.length - 1}
                        onClick={() => setRows(move(rows, index, 1))}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{nameOf(row)}</p>
                      <p className="text-muted text-xs tabular-nums">
                        {formatTarget(
                          row.plannedSets,
                          row.plannedReps,
                          row.plannedDurationSeconds,
                          t,
                        )}
                      </p>
                    </div>

                    <IconButton
                      size="sm"
                      label={t('common.edit')}
                      icon={<Pencil size={16} />}
                      onClick={() => {
                        setEditingRow(row);
                        setExerciseSheetOpen(true);
                      }}
                    />
                    <IconButton
                      size="sm"
                      tone="danger"
                      label={t('common.delete')}
                      icon={<Trash2 size={16} />}
                      onClick={() => setRows(rows.filter((item) => item.id !== row.id))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Sheet>

      {exerciseSheetOpen ? (
        <ExerciseEditorSheet
          open
          row={editingRow}
          onClose={() => setExerciseSheetOpen(false)}
          onSave={upsertRow}
        />
      ) : null}
    </>
  );
}
