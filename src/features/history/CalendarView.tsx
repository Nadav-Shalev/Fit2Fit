import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, IconButton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { DayOfWeek } from '@/models/common';
import { DAYS_OF_WEEK } from '@/models/common';
import { cn } from '@/utils/cn';
import {
  addMonths,
  eachDayOfRange,
  formatFullDate,
  formatMonthYear,
  formatWeekdayNarrow,
  getMonthRange,
  isSameDay,
  parseCalendarDate,
  toCalendarDate,
} from '@/utils/date';
import type { HistoryEntry } from './historyEntries';
import { SessionRow } from './SessionRow';

interface CalendarViewProps {
  entries: HistoryEntry[];
  weekStartsOn: DayOfWeek;
  onSelectEntry: (entry: HistoryEntry) => void;
}

/** Month grid with a marker on every day that has training logged. */
export function CalendarView({ entries, weekStartsOn, onSelectEntry }: CalendarViewProps) {
  const { t, language, direction } = useTranslation();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toCalendarDate(new Date()));

  const byDate = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date);
      if (list) list.push(entry);
      else map.set(entry.date, [entry]);
    }
    return map;
  }, [entries]);

  const days = useMemo(() => eachDayOfRange(getMonthRange(month)), [month]);

  // Blank cells so the first of the month lands under the right weekday.
  const leadingBlanks = useMemo(() => {
    const first = days[0];
    if (!first) return 0;
    return (first.getDay() - weekStartsOn + 7) % 7;
  }, [days, weekStartsOn]);

  const weekdayLabels = useMemo(() => {
    // 2024-01-07 was a Sunday, so this walks the week from the configured start.
    return DAYS_OF_WEEK.map((_, index) =>
      formatWeekdayNarrow(new Date(2024, 0, 7 + ((weekStartsOn + index) % 7)), language),
    );
  }, [weekStartsOn, language]);

  const today = new Date();
  const selectedEntries = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  const PreviousIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <IconButton
            size="sm"
            label={t('calendar.previousMonth')}
            icon={<PreviousIcon size={18} />}
            onClick={() => setMonth(addMonths(month, -1))}
          />
          <p className="font-bold">{formatMonthYear(month, language)}</p>
          <IconButton
            size="sm"
            label={t('calendar.nextMonth')}
            icon={<NextIcon size={18} />}
            onClick={() => setMonth(addMonths(month, 1))}
          />
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((label, index) => (
            <div key={index} className="text-muted pb-1 text-center text-xs font-semibold">
              {label}
            </div>
          ))}

          {Array.from({ length: leadingBlanks }, (_, index) => (
            <div key={`blank-${index}`} />
          ))}

          {days.map((day) => {
            const key = toCalendarDate(day);
            const dayEntries = byDate.get(key) ?? [];
            const isToday = isSameDay(day, today);
            const isSelected = key === selectedDate;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors',
                  isSelected ? 'bg-primary text-primary-fg font-bold' : 'hover:bg-elevated',
                  !isSelected && isToday && 'text-primary font-bold',
                )}
              >
                <span className="tabular-nums">{day.getDate()}</span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {dayEntries.some((entry) => entry.kind === 'strength') ? (
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        isSelected ? 'bg-primary-fg' : 'bg-primary',
                      )}
                    />
                  ) : null}
                  {dayEntries.some((entry) => entry.kind === 'running') ? (
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        isSelected ? 'bg-primary-fg' : 'bg-run',
                      )}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDate ? (
        <section>
          <h3 className="mb-2 text-sm font-bold">
            {formatFullDate(parseCalendarDate(selectedDate), language)}
          </h3>

          {selectedEntries.length === 0 ? (
            <p className="text-muted text-sm">{t('calendar.noEvents')}</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {selectedEntries.map((entry) => (
                <SessionRow key={entry.id} entry={entry} onClick={() => onSelectEntry(entry)} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
