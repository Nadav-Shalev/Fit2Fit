import { Footprints, PersonStanding, type LucideIcon } from 'lucide-react';
import type { TranslationKey } from '@/i18n/locales/en';
import { CARDIO_ACTIVITIES, type CardioActivity } from '@/models/running';

/** Icon and label for each cardio activity, shared by every screen that shows one. */
export const ACTIVITY_ICON: Record<CardioActivity, LucideIcon> = {
  run: Footprints,
  walk: PersonStanding,
};

export const ACTIVITY_LABEL: Record<CardioActivity, TranslationKey> = {
  run: 'running.activityRun',
  walk: 'running.activityWalk',
};

/** Options for the run/walk segmented control. */
export const ACTIVITY_OPTIONS = CARDIO_ACTIVITIES;
