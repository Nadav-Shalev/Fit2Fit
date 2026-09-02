import { ChevronLeft, ChevronRight, Dumbbell, Footprints } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { countCompletedSets } from '@/utils/analytics/volume';
import { cn } from '@/utils/cn';
import { formatRelativeDay, parseCalendarDate } from '@/utils/date';
import { formatDistance, formatDurationHuman, formatPace } from '@/utils/format';
import type { HistoryEntry } from './historyEntries';

export interface SessionRowProps {
  entry: HistoryEntry;
  onClick: () => void;
  className?: string;
}

/** One history line, shared by the dashboard's recent list and the history page. */
export function SessionRow({ entry, onClick, className }: SessionRowProps) {
  const { t, language, direction } = useTranslation();
  const Chevron = direction === 'rtl' ? ChevronLeft : ChevronRight;
  const dayLabel = formatRelativeDay(parseCalendarDate(entry.date), language, t);

  const isRunning = entry.kind === 'running';
  const name = isRunning
    ? entry.session.programName || t('running.freeRun')
    : entry.session.programName;

  const details = isRunning
    ? [
        formatDurationHuman(entry.session.durationSeconds, t),
        entry.session.distanceKm ? formatDistance(entry.session.distanceKm, t) : null,
        entry.session.paceSecondsPerKm
          ? `${formatPace(entry.session.paceSecondsPerKm)} ${t('units.perKm')}`
          : null,
      ]
    : [
        formatDurationHuman(entry.session.durationSeconds, t),
        `${countCompletedSets(entry.session)} ${t('workout.summarySets').toLowerCase()}`,
        entry.session.rpe ? `${t('rpe.label')} ${entry.session.rpe}` : null,
      ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'bg-surface border-line hover:border-muted/50 flex w-full items-center gap-3 rounded-2xl border p-3.5 text-start transition-colors',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          isRunning ? 'bg-run-soft text-run' : 'bg-primary-soft text-primary',
        )}
      >
        {isRunning ? <Footprints size={19} /> : <Dumbbell size={19} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-bold">{name}</span>
          <span className="text-muted shrink-0 text-xs tabular-nums">{dayLabel}</span>
        </span>
        <span className="text-muted mt-0.5 block truncate text-xs">
          {details.filter(Boolean).join(' · ')}
        </span>
      </span>

      <Chevron size={18} className="text-muted shrink-0" />
    </button>
  );
}
