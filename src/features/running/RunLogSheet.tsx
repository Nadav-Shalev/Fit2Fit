import { useMemo, useState } from 'react';
import { Button, NumberStepper, RpeScale, SelectField, Sheet, TextAreaField, TextField } from '@/components/ui';
import { FieldShell } from '@/components/ui/Field';
import { useTranslation } from '@/i18n';
import type { RunningProgram, RunningSession } from '@/models/running';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { calcPaceSecondsPerKm } from '@/utils/analytics/running';
import { parseCalendarDate, toCalendarDate } from '@/utils/date';
import { formatPaceWithUnit } from '@/utils/format';
import { createId } from '@/utils/id';

interface RunLogSheetProps {
  open: boolean;
  onClose: () => void;
  /** Existing run when editing. */
  session: RunningSession | null;
  /** Preselects a program, used when arriving from the dashboard. */
  initialProgramId?: string;
}

const FREE_RUN = 'free';

/**
 * Logs a completed run. Pace is derived from duration and distance rather than
 * entered, which is one less thing to get wrong after a run.
 */
export function RunLogSheet({ open, onClose, session, initialProgramId }: RunLogSheetProps) {
  const { t } = useTranslation();
  const runningPrograms = useDataStore((state) => state.runningPrograms);
  const saveRunningSession = useDataStore((state) => state.saveRunningSession);
  const pushToast = useToastStore((state) => state.push);

  const [programId, setProgramId] = useState(session?.programId ?? initialProgramId ?? FREE_RUN);
  const [date, setDate] = useState(session?.date ?? toCalendarDate(new Date()));
  const [minutes, setMinutes] = useState<number | undefined>(
    session ? Math.floor(session.durationSeconds / 60) : 30,
  );
  const [seconds, setSeconds] = useState<number | undefined>(
    session ? session.durationSeconds % 60 : 0,
  );
  const [distanceKm, setDistanceKm] = useState<number | undefined>(session?.distanceKm);
  const [rpe, setRpe] = useState<number | undefined>(session?.rpe);
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const durationSeconds = (minutes ?? 0) * 60 + (seconds ?? 0);
  const pace = useMemo(
    () => calcPaceSecondsPerKm(durationSeconds, distanceKm),
    [durationSeconds, distanceKm],
  );

  const selectedProgram: RunningProgram | undefined =
    programId === FREE_RUN ? undefined : runningPrograms.find((program) => program.id === programId);

  const handleSave = async () => {
    if (durationSeconds <= 0) {
      setError(t('running.durationRequired'));
      return;
    }

    const startedAt = session
      ? session.startedAt
      : (() => {
          const day = parseCalendarDate(date);
          const now = new Date();
          day.setHours(now.getHours(), now.getMinutes(), 0, 0);
          return day.toISOString();
        })();

    const run: RunningSession = {
      id: session?.id ?? createId(),
      programName: selectedProgram?.name ?? '',
      type: selectedProgram?.type ?? 'easy',
      date,
      startedAt,
      endedAt: new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString(),
      durationSeconds,
    };
    if (selectedProgram) run.programId = selectedProgram.id;
    if (distanceKm !== undefined && distanceKm > 0) {
      run.distanceKm = distanceKm;
      if (pace !== undefined) run.paceSecondsPerKm = pace;
    }
    if (rpe !== undefined) run.rpe = rpe;
    if (notes.trim()) run.notes = notes.trim();

    await saveRunningSession(run);
    pushToast(t('common.save'));
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={session ? t('running.editRun') : t('running.logRun')}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="run" fullWidth onClick={() => void handleSave()}>
            {t('running.saveRun')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField
          label={t('schedule.program')}
          value={programId}
          onChange={(event) => setProgramId(event.target.value)}
        >
          <option value={FREE_RUN}>{t('running.freeRun')}</option>
          {runningPrograms.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </SelectField>

        <TextField
          label={t('common.date')}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <FieldShell label={t('running.durationMinutes')} error={error}>
            <NumberStepper
              value={minutes}
              onChange={(value) => {
                setMinutes(value);
                setError(null);
              }}
              label={t('running.durationMinutes')}
              max={600}
            />
          </FieldShell>

          <FieldShell label={t('running.durationSeconds')}>
            <NumberStepper
              value={seconds}
              onChange={setSeconds}
              label={t('running.durationSeconds')}
              step={5}
              max={59}
            />
          </FieldShell>
        </div>

        <FieldShell
          label={`${t('running.distance')} (${t('units.km')})`}
          hint={pace !== undefined ? `${t('running.pace')}: ${formatPaceWithUnit(pace, t)}` : t('running.paceAuto')}
        >
          <NumberStepper
            value={distanceKm}
            onChange={setDistanceKm}
            label={t('running.distance')}
            step={0.1}
            max={500}
          />
        </FieldShell>

        <div>
          <p className="text-muted mb-2 text-sm font-medium">{t('rpe.question')}</p>
          <RpeScale value={rpe} onChange={setRpe} size="sm" />
        </div>

        <TextAreaField
          label={`${t('common.notes')} (${t('common.optional')})`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </Sheet>
  );
}
