import { PageHeader } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { LiveWorkout } from '@/features/workout/live/LiveWorkout';
import { WorkoutPicker } from '@/features/workout/WorkoutPicker';
import { useWorkoutStore } from '@/store/useWorkoutStore';

/**
 * Either picks a program to train, or hands over to the guided workout, which
 * takes over the whole screen for the duration of the session.
 */
export function WorkoutPage() {
  const { t } = useTranslation();
  const session = useWorkoutStore((state) => state.session);

  if (!session) {
    return (
      <div className="py-2">
        <PageHeader title={t('workout.title')} />
        <WorkoutPicker />
      </div>
    );
  }

  return <LiveWorkout session={session} />;
}
