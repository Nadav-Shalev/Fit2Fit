import { Dumbbell, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useDataStore } from '@/store/useDataStore';
import { countProgramSets, estimateProgramMinutes } from '@/utils/analytics/session';
import { useStartWorkout } from './useStartWorkout';

/** Shown on the workout tab when nothing is in progress: pick what to train. */
export function WorkoutPicker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const programs = useDataStore((state) => state.programs);
  const startWorkout = useStartWorkout();

  if (programs.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell size={30} />}
        title={t('workout.noPrograms')}
        description={t('workout.noProgramsHint')}
        action={<Button onClick={() => navigate('/programs')}>{t('dashboard.createProgram')}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-bold">{t('workout.chooseProgram')}</h2>

      {programs.map((program) => (
        <Card key={program.id} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{program.name}</p>
            <p className="text-muted text-xs">
              {t('programs.exerciseSummary', {
                exercises: program.exercises.length,
                sets: countProgramSets(program),
                minutes: estimateProgramMinutes(program),
              })}
            </p>
          </div>

          <Button
            icon={<Play size={17} />}
            disabled={program.exercises.length === 0}
            onClick={() => void startWorkout(program)}
          >
            {t('programs.start')}
          </Button>
        </Card>
      ))}
    </div>
  );
}
