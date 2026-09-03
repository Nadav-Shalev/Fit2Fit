import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Button,
  EmptyState,
  IconButton,
  NumberStepper,
  SegmentedControl,
  SelectField,
  Sheet,
  TextField,
} from '@/components/ui';
import { FieldShell } from '@/components/ui/Field';
import { useTranslation } from '@/i18n';
import {
  RUNNING_INTERVAL_KINDS,
  RUNNING_PROGRAM_TYPES,
  type CardioActivity,
  type RunningInterval,
  type RunningIntervalKind,
  type RunningProgram,
  type RunningProgramType,
  type RunningStep,
} from '@/models/running';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { calcRunningProgramDuration, cardioActivityOf } from '@/utils/analytics/running';
import { createId } from '@/utils/id';
import { ACTIVITY_LABEL, ACTIVITY_OPTIONS } from './cardioActivity';

interface RunningProgramEditorSheetProps {
  open: boolean;
  onClose: () => void;
  program: RunningProgram | null;
}

function newInterval(kind: RunningIntervalKind = 'run'): RunningInterval {
  return { id: createId(), kind, durationSeconds: 120 };
}

function newStep(): RunningStep {
  return { id: createId(), repeat: 1, intervals: [newInterval()] };
}

/** Editor for one interval: its kind and whether it is measured by time or distance. */
function IntervalEditor({
  interval,
  onChange,
  onRemove,
  canRemove,
}: {
  interval: RunningInterval;
  onChange: (next: RunningInterval) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { t } = useTranslation();
  const mode = interval.distanceMeters !== undefined ? 'distance' : 'duration';

  return (
    <div className="bg-elevated border-line flex flex-col gap-2 rounded-xl border p-2.5">
      <div className="flex items-center gap-2">
        <select
          value={interval.kind}
          onChange={(event) => onChange({ ...interval, kind: event.target.value as RunningIntervalKind })}
          className="bg-surface border-line h-9 min-w-0 flex-1 rounded-lg border px-2 text-sm focus:border-run focus:outline-none"
        >
          {RUNNING_INTERVAL_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`intervalKind.${kind}`)}
            </option>
          ))}
        </select>

        <SegmentedControl
          size="sm"
          ariaLabel={t('running.intervalKind')}
          value={mode}
          onChange={(next) =>
            onChange(
              next === 'duration'
                ? { id: interval.id, kind: interval.kind, durationSeconds: 120 }
                : { id: interval.id, kind: interval.kind, distanceMeters: 400 },
            )
          }
          options={[
            { value: 'duration', label: t('running.byDuration') },
            { value: 'distance', label: t('running.byDistance') },
          ]}
        />

        <IconButton
          size="sm"
          tone="danger"
          label={t('common.remove')}
          icon={<Trash2 size={15} />}
          disabled={!canRemove}
          onClick={onRemove}
        />
      </div>

      {mode === 'duration' ? (
        <NumberStepper
          size="sm"
          label={t('running.minutes')}
          step={30}
          max={7200}
          value={interval.durationSeconds}
          onChange={(value) => onChange({ ...interval, durationSeconds: value ?? 0 })}
        />
      ) : (
        <NumberStepper
          size="sm"
          label={t('running.meters')}
          step={100}
          max={100000}
          value={interval.distanceMeters}
          onChange={(value) => onChange({ ...interval, distanceMeters: value ?? 0 })}
        />
      )}
    </div>
  );
}

/**
 * Builds a running program out of repeatable blocks, which is what makes
 * "6 x (2 min run / 1 min walk)" a single entry instead of twelve.
 */
export function RunningProgramEditorSheet({
  open,
  onClose,
  program,
}: RunningProgramEditorSheetProps) {
  const { t } = useTranslation();
  const saveRunningProgram = useDataStore((state) => state.saveRunningProgram);
  const pushToast = useToastStore((state) => state.push);

  const [name, setName] = useState(program?.name ?? '');
  const [activity, setActivity] = useState<CardioActivity>(
    program ? cardioActivityOf(program) : 'run',
  );
  const [type, setType] = useState<RunningProgramType>(program?.type ?? 'intervals');
  const [steps, setSteps] = useState<RunningStep[]>(program?.steps ?? [newStep()]);
  const [error, setError] = useState<string | null>(null);

  const patchStep = (id: string, patch: Partial<RunningStep>) => {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('programs.nameRequired'));
      return;
    }

    const now = new Date().toISOString();
    const saved: RunningProgram = {
      id: program?.id ?? createId(),
      name: name.trim(),
      type,
      activity,
      steps: steps.filter((step) => step.intervals.length > 0),
      createdAt: program?.createdAt ?? now,
      updatedAt: now,
    };

    await saveRunningProgram(saved);
    pushToast(t('common.save'));
    onClose();
  };

  const totalMinutes = Math.round(
    calcRunningProgramDuration({
      id: '',
      name: '',
      type,
      steps,
      createdAt: '',
      updatedAt: '',
    }) / 60,
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={program ? t('running.editProgram') : t('running.newProgram')}
      description={totalMinutes > 0 ? t('running.estimated', { minutes: totalMinutes }) : undefined}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="run" fullWidth onClick={() => void handleSave()}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label={t('running.programName')}
          placeholder={t('running.programNamePlaceholder')}
          value={name}
          error={error}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
        />

        <FieldShell label={t('running.activity')}>
          <SegmentedControl
            ariaLabel={t('running.activity')}
            value={activity}
            onChange={setActivity}
            options={ACTIVITY_OPTIONS.map((option) => ({
              value: option,
              label: t(ACTIVITY_LABEL[option]),
            }))}
          />
        </FieldShell>

        <SelectField
          label={t('running.type')}
          value={type}
          onChange={(event) => setType(event.target.value as RunningProgramType)}
        >
          {RUNNING_PROGRAM_TYPES.map((option) => (
            <option key={option} value={option}>
              {t(`runningType.${option}`)}
            </option>
          ))}
        </SelectField>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">{t('running.steps')}</h3>
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={() => setSteps([...steps, newStep()])}
            >
              {t('running.addStep')}
            </Button>
          </div>

          {steps.length === 0 ? (
            <EmptyState title={t('running.noSteps')} description={t('running.noStepsHint')} />
          ) : (
            <div className="flex flex-col gap-3">
              {steps.map((step, index) => (
                <div key={step.id} className="border-line rounded-xl border p-3">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-muted text-sm font-bold">{index + 1}</span>

                    <FieldShell label={t('running.repeat')} className="flex-1">
                      <NumberStepper
                        size="sm"
                        label={t('running.repeat')}
                        min={1}
                        max={99}
                        value={step.repeat}
                        onChange={(value) => patchStep(step.id, { repeat: Math.max(1, value ?? 1) })}
                      />
                    </FieldShell>

                    <IconButton
                      size="sm"
                      tone="danger"
                      label={t('common.remove')}
                      icon={<Trash2 size={16} />}
                      onClick={() => setSteps(steps.filter((item) => item.id !== step.id))}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    {step.intervals.map((interval) => (
                      <IntervalEditor
                        key={interval.id}
                        interval={interval}
                        canRemove={step.intervals.length > 1}
                        onChange={(next) =>
                          patchStep(step.id, {
                            intervals: step.intervals.map((item) =>
                              item.id === next.id ? next : item,
                            ),
                          })
                        }
                        onRemove={() =>
                          patchStep(step.id, {
                            intervals: step.intervals.filter((item) => item.id !== interval.id),
                          })
                        }
                      />
                    ))}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    icon={<Plus size={15} />}
                    onClick={() =>
                      patchStep(step.id, { intervals: [...step.intervals, newInterval('walk')] })
                    }
                  >
                    {t('running.addInterval')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
