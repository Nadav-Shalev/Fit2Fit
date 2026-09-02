import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Dumbbell, Footprints, Play } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WorkoutProgram } from '@/models/program';
import type { RunningProgram } from '@/models/running';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import type { NextWorkout } from '@/services/scheduleService';
import { calcRunningProgramDuration } from '@/utils/analytics/running';
import { estimateProgramMinutes } from '@/utils/analytics/session';
import { formatWeekday } from '@/utils/date';

interface NextWorkoutCardProps {
  next: NextWorkout | null;
  programs: WorkoutProgram[];
  runningPrograms: RunningProgram[];
  /** Disabled while a workout is already running. */
  disabled: boolean;
}

/**
 * The main call to action. Reads the next slot from the weekly plan and starts
 * it in one tap; without a plan it falls back to the first available program.
 */
export function NextWorkoutCard({
  next,
  programs,
  runningPrograms,
  disabled,
}: NextWorkoutCardProps) {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const startWorkout = useStartWorkout();

  const scheduledStrength =
    next?.kind === 'strength' ? programs.find((program) => program.id === next.programId) : undefined;
  const scheduledRunning =
    next?.kind === 'running'
      ? runningPrograms.find((program) => program.id === next.programId)
      : undefined;

  // Without a weekly plan the card still offers something concrete to do.
  const fallbackProgram = programs[0];
  const strengthProgram = scheduledStrength ?? (next ? undefined : fallbackProgram);

  if (!strengthProgram && !scheduledRunning) {
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

  const dayLabel = next
    ? next.isToday
      ? t('common.today')
      : formatWeekday(next.date, language)
    : t('dashboard.chooseWorkout');

  if (scheduledRunning) {
    const minutes = Math.round(calcRunningProgramDuration(scheduledRunning) / 60);

    return (
      <Card className="border-run/30 mb-5">
        <Badge tone="run" icon={<Footprints size={13} />}>
          {dayLabel}
        </Badge>
        <h2 className="mt-3 text-2xl font-extrabold">{scheduledRunning.name}</h2>
        <p className="text-muted mt-1 text-sm">
          {minutes > 0 ? t('running.estimated', { minutes }) : t('running.title')}
        </p>
        <Button
          variant="run"
          size="lg"
          fullWidth
          className="mt-4"
          icon={<Play size={20} />}
          onClick={() => navigate(`/running?program=${scheduledRunning.id}`)}
        >
          {t('running.logRun')}
        </Button>
      </Card>
    );
  }

  if (!strengthProgram) return null;

  const exerciseCount = strengthProgram.exercises.length;
  const minutes = estimateProgramMinutes(strengthProgram);

  return (
    <Card className="border-primary/30 mb-5">
      <Badge tone="primary" icon={<Dumbbell size={13} />}>
        {dayLabel}
      </Badge>

      <h2 className="mt-3 text-2xl font-extrabold">{strengthProgram.name}</h2>
      <p className="text-muted mt-1 text-sm">
        {t('dashboard.exercisesCount', { count: exerciseCount })} ·{' '}
        {t('dashboard.estimatedTime', { minutes })}
      </p>

      <Button
        size="lg"
        fullWidth
        className="mt-4"
        disabled={disabled || exerciseCount === 0}
        icon={<Play size={20} />}
        onClick={() => void startWorkout(strengthProgram)}
      >
        {t('dashboard.startWorkout')}
      </Button>
    </Card>
  );
}
