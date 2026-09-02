import { useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader, SegmentedControl, SelectField } from '@/components/ui';
import { TextField } from '@/components/ui/Field';
import { useTranslation } from '@/i18n';
import { CalendarView } from '@/features/history/CalendarView';
import { SessionDetailSheet } from '@/features/history/SessionDetailSheet';
import { SessionRow } from '@/features/history/SessionRow';
import { buildHistoryEntries, type HistoryEntry } from '@/features/history/historyEntries';
import { useDataStore } from '@/store/useDataStore';

type Tab = 'list' | 'calendar';
type TypeFilter = 'all' | 'strength' | 'running';

const ALL_PROGRAMS = 'all';

/** Full training history with filters, plus a month calendar of the same data. */
export function HistoryPage() {
  const { t } = useTranslation();

  const workoutSessions = useDataStore((state) => state.workoutSessions);
  const runningSessions = useDataStore((state) => state.runningSessions);
  const weekStartsOn = useDataStore((state) => state.settings.weekStartsOn);

  const [tab, setTab] = useState<Tab>('list');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [programFilter, setProgramFilter] = useState(ALL_PROGRAMS);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  const allEntries = useMemo(
    () => buildHistoryEntries(workoutSessions, runningSessions),
    [workoutSessions, runningSessions],
  );

  // Program names come from the sessions themselves, so history stays filterable
  // even after the underlying program has been deleted.
  const programNames = useMemo(
    () =>
      [...new Set(allEntries.map((entry) => entry.session.programName).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [allEntries],
  );

  const filtered = useMemo(
    () =>
      allEntries.filter((entry) => {
        if (typeFilter !== 'all' && entry.kind !== typeFilter) return false;
        if (programFilter !== ALL_PROGRAMS && entry.session.programName !== programFilter) {
          return false;
        }
        if (from && entry.date < from) return false;
        if (to && entry.date > to) return false;
        return true;
      }),
    [allEntries, typeFilter, programFilter, from, to],
  );

  const hasFilters =
    typeFilter !== 'all' || programFilter !== ALL_PROGRAMS || from !== '' || to !== '';

  const clearFilters = () => {
    setTypeFilter('all');
    setProgramFilter(ALL_PROGRAMS);
    setFrom('');
    setTo('');
  };

  return (
    <div className="py-2">
      <PageHeader
        title={t('history.title')}
        subtitle={t('history.workoutCount', { count: allEntries.length })}
      />

      <SegmentedControl
        className="mb-5"
        ariaLabel={t('history.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'list', label: t('history.tabList') },
          { value: 'calendar', label: t('history.tabCalendar') },
        ]}
      />

      {tab === 'list' ? (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label={t('history.filterType')}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              >
                <option value="all">{t('common.all')}</option>
                <option value="strength">{t('history.filterStrength')}</option>
                <option value="running">{t('history.filterRunning')}</option>
              </SelectField>

              <SelectField
                label={t('history.filterProgram')}
                value={programFilter}
                onChange={(event) => setProgramFilter(event.target.value)}
              >
                <option value={ALL_PROGRAMS}>{t('common.all')}</option>
                {programNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </SelectField>

              <TextField
                label={t('history.filterFrom')}
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <TextField
                label={t('history.filterTo')}
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>

            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                icon={<X size={15} />}
                onClick={clearFilters}
              >
                {t('history.clearFilters')}
              </Button>
            ) : null}
          </Card>

          {allEntries.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={30} />}
              title={t('history.empty')}
              description={t('history.emptyHint')}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t('history.emptyFiltered')}
              description={t('history.emptyFilteredHint')}
              action={<Button onClick={clearFilters}>{t('history.clearFilters')}</Button>}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((entry) => (
                <SessionRow key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <CalendarView
          entries={allEntries}
          weekStartsOn={weekStartsOn}
          onSelectEntry={setSelected}
        />
      )}

      <SessionDetailSheet entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
