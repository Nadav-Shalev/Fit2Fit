import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CheckCircle2, Dumbbell, Footprints, Play } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WorkoutProgram } from '@/models/program';
import type { RunningProgram } from '@/models/running';
import type { ResolvedScheduleItem } from '@/models/schedule';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import type { NextWorkout } from '@/services/scheduleService';
import { calcRunningProgramDuration } from '@/utils/analytics/running';
import { estimateProgramMinutes } from '@/utils/analytics/session';
import { formatWeekday } from '@/utils/date';

interface TodayCardProps {
  /** Today's slots from the weekly plan, done and outstanding alike. */
  today: ResolvedScheduleItem[];
  next: NextWorkout | null;
  programs: WorkoutProgram[];
  runningPrograms: RunningProgram[];
  /** Disabled while a workout is already running. */
  disabled: boolean;
}

/**
 * The one thing to do today.
 *
 * It leads with what the weekly plan asks for; without a plan it offers the
 * first program rather than nothing, and on a rest day it says so plainly and
 * points at what is coming next.
 */
export function TodayCard({ today, next, programs, runningPrograms, disabled }: TodayCardProps) {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const startWorkout = useStartWorkout();

  if (programs.length === 0 && runningPrograms.length === 0) {
    return (
      <Card className="mb-5">
        <div className="flex flex-col items-start gap-3">
          <Badge tone="neutral" icon={<CalendarPlus size={13} />}>
            {t('dashboard.nextWorkout')}
          </Badge>
          <p className="font-bold">{t('dashboard.noPrograms')}</p>
          <p className="text-muted text-sm">{t('dashboard.noProgramsHint')}</p>
          <Button onClick={() => navigate('/programs')}>{t('dashboard.createProgram')}</Button>
        </div>
      </Card>
    );
  }

  const outstanding = today.find((item) => item.status !== 'done');

  // Scheduled for today and not done yet — the headline case.
  if (outstanding) {
    const isCardio = outstanding.entry.kind === 'running';
    const cardioProgram = isCardio
      ? runningPrograms.find((program) => program.id === outstanding.entry.programId)
      : undefined;
    const strengthProgram = isCardio
      ? undefined
      : programs.find((program) => program.id === outstanding.entry.programId);

    const minutes = cardioProgram
      ? Math.round(calcRunningProgramDuration(cardioProgram) / 60)
      : strengthProgram
        ? estimateProgramMinutes(strengthProgram)
        : 0;

    return (
      <Card className={isCardio ? 'border-run/30 mb-5' : 'border-primary/30 mb-5'}>
        <Badge
          tone={isCardio ? 'run' : 'primary'}
          icon={isCardio ? <Footprints size={13} /> : <Dumbbell size={13} />}
        >
          {t('common.today')}
        </Badge>

        <h2 className="mt-3 text-2xl font-extrabold">
          {t('dashboard.todayPlan', { name: outstanding.programName })}
        </h2>

        {minutes > 0 ? (
          <p className="text-muted mt-1 text-sm">
            {strengthProgram
              ? `${t('dashboard.exercisesCount', { count: strengthProgram.exercises.length })} · ${t('dashboard.estimatedTime', { minutes })}`
              : t('running.estimated', { minutes })}
          </p>
        ) : null}

        <Button
          variant={isCardio ? 'run' : 'primary'}
          size="lg"
          fullWidth
          className="mt-4"
          icon={<Play size={20} />}
          disabled={disabled || (!isCardio && (strengthProgram?.exercises.length ?? 0) === 0)}
          onClick={() => {
            if (cardioProgram) {
              navigate(`/running?program=${cardioProgram.id}`);
            } else if (strengthProgram) {
              void startWorkout(strengthProgram);
            }
          }}
        >
          {t('dashboard.startNamed', { name: outstanding.programName })}
        </Button>
      </Card>
    );
  }

  // Everything today's plan asked for is done.
  if (today.length > 0) {
    return (
      <Card className="border-primary/30 mb-5">
        <Badge tone="success" icon={<CheckCircle2 size={13} />}>
          {t('common.today')}
        </Badge>
        <h2 className="mt-3 text-xl font-extrabold">{t('dashboard.todayDone')}</h2>
        <p className="text-muted mt-1 text-sm">{t('dashboard.todayDoneHint')}</p>
        {next && !next.isToday ? (
          <p className="mt-3 text-sm font-semibold">
            {t('dashboard.nextPlanned', {
              name: next.programName,
              day: formatWeekday(next.date, language),
            })}
          </p>
        ) : null}
      </Card>
    );
  }

  // No plan for today: stay calm, but keep something concrete within reach.
  const fallback = programs[0];

  return (
    <Card className="mb-5">
      <Badge tone="neutral" icon={<CalendarPlus size={13} />}>
        {t('common.today')}
      </Badge>
      <h2 className="mt-3 text-xl font-extrabold">{t('dashboard.noPlanToday')}</h2>
      <p className="text-muted mt-1 text-sm">{t('dashboard.noPlanTodayHint')}</p>

      {next ? (
        <p className="mt-3 text-sm font-semibold">
          {t('dashboard.nextPlanned', {
            name: next.programName,
            day: next.isToday ? t('common.today') : formatWeekday(next.date, language),
          })}
        </p>
      ) : null}

      {fallback ? (
        <Button
          variant="secondary"
          fullWidth
          className="mt-4"
          icon={<Play size={18} />}
          disabled={disabled || fallback.exercises.length === 0}
          onClick={() => void startWorkout(fallback)}
        >
          {t('dashboard.startNamed', { name: fallback.name })}
        </Button>
      ) : null}
    </Card>
  );
}
