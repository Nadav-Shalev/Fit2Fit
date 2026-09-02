import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Footprints, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageHeader,
  SegmentedControl,
  StatTile,
} from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { RunningProgram } from '@/models/running';
import { RunLogSheet } from '@/features/running/RunLogSheet';
import { RunningProgramEditorSheet } from '@/features/running/RunningProgramEditorSheet';
import { SessionDetailSheet } from '@/features/history/SessionDetailSheet';
import { SessionRow } from '@/features/history/SessionRow';
import { buildHistoryEntries, type HistoryEntry } from '@/features/history/historyEntries';
import { ACTIVITY_ICON, ACTIVITY_LABEL } from '@/features/running/cardioActivity';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import {
  averagePace,
  calcRunningProgramDuration,
  cardioActivityOf,
  filterRunsInRange,
  sumRunningDistance,
} from '@/utils/analytics/running';
import { getWeekRange } from '@/utils/date';
import { formatDistance, formatPaceWithUnit } from '@/utils/format';

type Tab = 'log' | 'programs';

/** Cardio area: logged runs and walks on one tab, reusable structures on the other. */
export function RunningPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const runningPrograms = useDataStore((state) => state.runningPrograms);
  const runningSessions = useDataStore((state) => state.runningSessions);
  const deleteRunningProgram = useDataStore((state) => state.deleteRunningProgram);
  const weekStartsOn = useDataStore((state) => state.settings.weekStartsOn);
  const pushToast = useToastStore((state) => state.push);

  const [tab, setTab] = useState<Tab>('log');
  const [logOpen, setLogOpen] = useState(false);
  const [initialProgramId, setInitialProgramId] = useState<string | undefined>();
  const [programSheetOpen, setProgramSheetOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<RunningProgram | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RunningProgram | null>(null);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  // Arriving from the dashboard's running card opens the log with that program.
  useEffect(() => {
    const programId = searchParams.get('program');
    if (!programId) return;
    setInitialProgramId(programId);
    setLogOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const entries = useMemo(() => buildHistoryEntries([], runningSessions), [runningSessions]);

  const weekStats = useMemo(() => {
    const runs = filterRunsInRange(runningSessions, getWeekRange(new Date(), weekStartsOn));
    return {
      count: runs.length,
      distance: sumRunningDistance(runs),
      pace: averagePace(runs),
    };
  }, [runningSessions, weekStartsOn]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteRunningProgram(pendingDelete.id);
    pushToast(t('common.delete'), 'info');
    setPendingDelete(null);
  };

  return (
    <div className="py-2">
      <PageHeader
        title={t('running.title')}
        action={
          tab === 'log' ? (
            <Button
              variant="run"
              icon={<Plus size={18} />}
              onClick={() => {
                setInitialProgramId(undefined);
                setLogOpen(true);
              }}
            >
              {t('running.logRun')}
            </Button>
          ) : (
            <Button
              variant="run"
              icon={<Plus size={18} />}
              onClick={() => {
                setEditingProgram(null);
                setProgramSheetOpen(true);
              }}
            >
              {t('common.add')}
            </Button>
          )
        }
      />

      <SegmentedControl
        className="mb-5"
        ariaLabel={t('running.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'log', label: t('running.tabLog') },
          { value: 'programs', label: t('running.tabPrograms') },
        ]}
      />

      {tab === 'log' ? (
        <>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <StatTile
              tone="run"
              label={t('dashboard.thisWeek')}
              value={weekStats.count}
              icon={<Footprints size={13} />}
            />
            <StatTile
              tone="run"
              label={t('running.totalDistance')}
              value={formatDistance(weekStats.distance, t)}
            />
            <StatTile label={t('running.pace')} value={formatPaceWithUnit(weekStats.pace, t)} />
          </div>

          {entries.length === 0 ? (
            <EmptyState
              icon={<Footprints size={30} />}
              title={t('running.emptyRuns')}
              description={t('running.emptyRunsHint')}
              action={
                <Button variant="run" onClick={() => setLogOpen(true)}>
                  {t('running.logRun')}
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {entries.map((entry) => (
                <SessionRow key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
              ))}
            </div>
          )}
        </>
      ) : runningPrograms.length === 0 ? (
        <EmptyState
          icon={<Footprints size={30} />}
          title={t('running.emptyPrograms')}
          description={t('running.emptyProgramsHint')}
          action={
            <Button
              variant="run"
              onClick={() => {
                setEditingProgram(null);
                setProgramSheetOpen(true);
              }}
            >
              {t('running.newProgram')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {runningPrograms.map((program) => {
            const minutes = Math.round(calcRunningProgramDuration(program) / 60);
            const activity = cardioActivityOf(program);
            const ActivityIcon = ACTIVITY_ICON[activity];
            return (
              <Card key={program.id}>
                <div className="flex items-start gap-2">
                  <span className="bg-run-soft text-run flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <ActivityIcon size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{program.name}</h3>
                    <p className="text-muted mt-0.5 text-xs">
                      {t(ACTIVITY_LABEL[activity])} · {t(`runningType.${program.type}`)}
                      {minutes > 0 ? ` · ${t('running.estimated', { minutes })}` : ''}
                    </p>
                  </div>

                  <IconButton
                    size="sm"
                    label={t('common.edit')}
                    icon={<Pencil size={16} />}
                    onClick={() => {
                      setEditingProgram(program);
                      setProgramSheetOpen(true);
                    }}
                  />
                  <IconButton
                    size="sm"
                    tone="danger"
                    label={t('common.delete')}
                    icon={<Trash2 size={16} />}
                    onClick={() => setPendingDelete(program)}
                  />
                </div>

                <ul className="border-line mt-3 flex flex-col gap-1 border-t pt-3 text-sm">
                  {program.steps.map((step) => (
                    <li key={step.id} className="flex items-baseline gap-2">
                      {step.repeat > 1 ? (
                        <span className="text-run shrink-0 text-xs font-bold">
                          {t('running.repeatTimes', { count: step.repeat })}
                        </span>
                      ) : null}
                      <span className="text-muted truncate">
                        {step.intervals
                          .map((interval) => {
                            const label = t(`intervalKind.${interval.kind}`);
                            if (interval.durationSeconds) {
                              return `${label} ${Math.round(interval.durationSeconds / 60)} ${t('units.min')}`;
                            }
                            if (interval.distanceMeters) {
                              return `${label} ${interval.distanceMeters} m`;
                            }
                            return label;
                          })
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="run"
                  fullWidth
                  className="mt-4"
                  onClick={() => {
                    setInitialProgramId(program.id);
                    setLogOpen(true);
                  }}
                >
                  {t('running.logRun')}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {logOpen ? (
        <RunLogSheet
          open
          session={null}
          initialProgramId={initialProgramId}
          onClose={() => setLogOpen(false)}
        />
      ) : null}

      {programSheetOpen ? (
        <RunningProgramEditorSheet
          open
          program={editingProgram}
          onClose={() => setProgramSheetOpen(false)}
        />
      ) : null}

      <SessionDetailSheet entry={selected} onClose={() => setSelected(null)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('running.deleteProgramTitle')}
        body={t('running.deleteProgramBody', { name: pendingDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
