import { useMemo, useState } from 'react';
import { Check, CircleDashed, Dumbbell, Footprints, Plus, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, IconButton, SelectField, Sheet } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { DAYS_OF_WEEK, type DayOfWeek } from '@/models/common';
import type { ScheduleEntry, ScheduleEntryKind } from '@/models/schedule';
import { resolveWeek } from '@/services/scheduleService';
import { useDataStore } from '@/store/useDataStore';
import { cn } from '@/utils/cn';
import { weekdayName } from '@/utils/date';
import { createId } from '@/utils/id';

/** Weekly plan editor. The dashboard reads the next workout from what is set here. */
export function ScheduleEditor() {
  const { t, language } = useTranslation();
  const schedule = useDataStore((state) => state.schedule);
  const programs = useDataStore((state) => state.programs);
  const runningPrograms = useDataStore((state) => state.runningPrograms);
  const workoutSessions = useDataStore((state) => state.workoutSessions);
  const runningSessions = useDataStore((state) => state.runningSessions);
  const settings = useDataStore((state) => state.settings);
  const saveSchedule = useDataStore((state) => state.saveSchedule);

  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState<DayOfWeek>(0);
  const [kind, setKind] = useState<ScheduleEntryKind>('strength');
  const [programId, setProgramId] = useState('');

  const availablePrograms = kind === 'strength' ? programs : runningPrograms;

  const resolved = useMemo(
    () =>
      resolveWeek(
        { schedule, programs, runningPrograms, workoutSessions, runningSessions },
        new Date(),
        settings.weekStartsOn,
      ),
    [schedule, programs, runningPrograms, workoutSessions, runningSessions, settings.weekStartsOn],
  );

  const statusOf = (entryId: string) => resolved.find((item) => item.entry.id === entryId)?.status;

  const orderedDays = useMemo(() => {
    const start = settings.weekStartsOn;
    return DAYS_OF_WEEK.map((_, index) => ((start + index) % 7) as DayOfWeek);
  }, [settings.weekStartsOn]);

  const nameOf = (entry: ScheduleEntry) => {
    const source = entry.kind === 'strength' ? programs : runningPrograms;
    return source.find((program) => program.id === entry.programId)?.name ?? '—';
  };

  const addEntry = async () => {
    const chosen = programId || availablePrograms[0]?.id;
    if (!chosen) return;
    await saveSchedule({
      entries: [...schedule.entries, { id: createId(), dayOfWeek: day, kind, programId: chosen }],
    });
    setAdding(false);
    setProgramId('');
  };

  const removeEntry = async (id: string) => {
    await saveSchedule({ entries: schedule.entries.filter((entry) => entry.id !== id) });
  };

  const hasPrograms = programs.length > 0 || runningPrograms.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted text-sm">{t('schedule.hint')}</p>

      {!hasPrograms ? (
        <EmptyState title={t('schedule.empty')} description={t('schedule.noProgramsHint')} />
      ) : schedule.entries.length === 0 ? (
        <EmptyState
          title={t('schedule.empty')}
          description={t('schedule.emptyHint')}
          action={
            <Button icon={<Plus size={17} />} onClick={() => setAdding(true)}>
              {t('schedule.addEntry')}
            </Button>
          }
        />
      ) : (
        <>
          <Card flush className="divide-line divide-y">
            {orderedDays.map((dayOfWeek) => {
              const entries = schedule.entries.filter((entry) => entry.dayOfWeek === dayOfWeek);
              return (
                <div key={dayOfWeek} className="flex items-start gap-3 p-3.5">
                  <span className="text-muted w-20 shrink-0 pt-1 text-sm font-semibold">
                    {weekdayName(dayOfWeek, language)}
                  </span>

                  {entries.length === 0 ? (
                    <span className="text-muted/60 pt-1 text-sm">{t('schedule.restDay')}</span>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      {entries.map((entry) => {
                        const status = statusOf(entry.id);
                        return (
                          <span
                            key={entry.id}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full py-1 ps-2.5 pe-1 text-xs font-semibold',
                              entry.kind === 'strength'
                                ? 'bg-primary-soft text-primary'
                                : 'bg-run-soft text-run',
                            )}
                          >
                            {entry.kind === 'strength' ? (
                              <Dumbbell size={12} />
                            ) : (
                              <Footprints size={12} />
                            )}
                            <span className="truncate">{nameOf(entry)}</span>
                            {status === 'done' ? <Check size={12} /> : null}
                            {status === 'missed' ? <CircleDashed size={12} /> : null}
                            <IconButton
                              size="sm"
                              className="size-5"
                              label={t('common.remove')}
                              icon={<X size={12} />}
                              onClick={() => void removeEntry(entry.id)}
                            />
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={<Plus size={17} />} onClick={() => setAdding(true)}>
              {t('schedule.addEntry')}
            </Button>
            <div className="text-muted flex gap-2 text-xs">
              <Badge tone="success">
                <Check size={11} /> {t('schedule.done')}
              </Badge>
              <Badge tone="warning">
                <CircleDashed size={11} /> {t('schedule.missed')}
              </Badge>
            </div>
          </div>
        </>
      )}

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title={t('schedule.addEntry')}
        footer={
          <Button fullWidth onClick={() => void addEntry()} disabled={availablePrograms.length === 0}>
            {t('common.add')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectField
            label={t('schedule.day')}
            value={String(day)}
            onChange={(event) => setDay(Number(event.target.value) as DayOfWeek)}
          >
            {orderedDays.map((value) => (
              <option key={value} value={value}>
                {weekdayName(value, language)}
              </option>
            ))}
          </SelectField>

          <SelectField
            label={t('schedule.kind')}
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as ScheduleEntryKind);
              setProgramId('');
            }}
          >
            <option value="strength">{t('schedule.strength')}</option>
            <option value="running">{t('schedule.running')}</option>
          </SelectField>

          <SelectField
            label={t('schedule.program')}
            value={programId || (availablePrograms[0]?.id ?? '')}
            onChange={(event) => setProgramId(event.target.value)}
          >
            {availablePrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </SelectField>
        </div>
      </Sheet>
    </div>
  );
}
