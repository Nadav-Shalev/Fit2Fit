import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WorkoutProgram } from '@/models/program';
import { useDataStore } from '@/store/useDataStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';

/**
 * Starts a workout from a program and moves straight into workout mode.
 * Shared by the dashboard, the programs list and the workout picker.
 */
export function useStartWorkout(): (program: WorkoutProgram) => Promise<void> {
  const navigate = useNavigate();
  const exercises = useDataStore((state) => state.exercises);
  const settings = useDataStore((state) => state.settings);
  const start = useWorkoutStore((state) => state.start);

  return useCallback(
    async (program: WorkoutProgram) => {
      await start(program, exercises, settings);
      navigate('/workout');
    },
    [start, exercises, settings, navigate],
  );
}
