import { describe, expect, it } from 'vitest';
import { translate } from '@/i18n/translate';
import type { TranslationKey } from '@/i18n/locales/en';
import type { TranslationVars } from '@/i18n/types';
import {
  formatClock,
  formatDistance,
  formatDuration,
  formatDurationHuman,
  formatPace,
  formatRange,
  formatSetBreakdown,
  formatSignedNumber,
  formatTarget,
  formatWeight,
} from './format';

const t = (key: TranslationKey, vars?: TranslationVars) => translate('en', key, vars);

describe('formatDuration', () => {
  it('renders hours, minutes and seconds', () => {
    expect(formatDuration(37 * 60 + 42)).toBe('00:37:42');
    expect(formatDuration(3 * 3600 + 5 * 60 + 9)).toBe('03:05:09');
  });

  it('clamps negative input to zero', () => {
    expect(formatDuration(-5)).toBe('00:00:00');
  });
});

describe('formatClock', () => {
  it('renders minutes and seconds only', () => {
    expect(formatClock(90)).toBe('01:30');
  });
});

describe('formatDurationHuman', () => {
  it('uses minutes below an hour', () => {
    expect(formatDurationHuman(52 * 60, t)).toBe('52 minutes');
    expect(formatDurationHuman(60, t)).toBe('1 minute');
  });

  it('combines hours and minutes', () => {
    expect(formatDurationHuman(72 * 60, t)).toBe('1 hour and 12 minutes');
    expect(formatDurationHuman(2 * 3600, t)).toBe('2 hours');
  });

  it('describes very short durations', () => {
    expect(formatDurationHuman(20, t)).toBe('less than a minute');
  });
});

describe('formatPace', () => {
  it('formats seconds per kilometre as minutes and seconds', () => {
    expect(formatPace(455)).toBe('7:35');
  });

  it('rolls a rounded 60 seconds into the next minute', () => {
    expect(formatPace(419.7)).toBe('7:00');
  });

  it('renders a dash when there is no pace', () => {
    expect(formatPace(undefined)).toBe('—');
    expect(formatPace(0)).toBe('—');
  });
});

describe('formatDistance', () => {
  it('trims trailing zeros', () => {
    expect(formatDistance(3.2, t)).toBe('3.2 km');
    expect(formatDistance(5, t)).toBe('5 km');
  });
});

describe('formatWeight', () => {
  it('formats kilograms', () => {
    expect(formatWeight(20, 'kg', t)).toBe('20 kg');
  });

  it('converts to pounds when that unit is selected', () => {
    expect(formatWeight(10, 'lb', t)).toBe('22 lb');
  });
});

describe('formatRange and formatTarget', () => {
  it('renders an exact value and a range', () => {
    expect(formatRange({ min: 15 })).toBe('15');
    expect(formatRange({ min: 8, max: 12 })).toBe('8–12');
  });

  it('renders a set target', () => {
    expect(formatTarget(3, { min: 15 }, undefined, t)).toBe('3 × 15');
    expect(formatTarget(3, null, 60, t)).toBe('3 × 60 sec');
  });
});

describe('formatSetBreakdown', () => {
  it('collapses identical sets into the compact form', () => {
    expect(
      formatSetBreakdown(
        [
          { reps: 10, weightKg: 80 },
          { reps: 10, weightKg: 80 },
          { reps: 10, weightKg: 80 },
        ],
        'kg',
        t,
      ),
    ).toBe('3 × 10 reps @ 80 kg');
  });

  it('lists the actual reps when a set fell short', () => {
    expect(
      formatSetBreakdown(
        [
          { reps: 12, weightKg: 80 },
          { reps: 10, weightKg: 80 },
          { reps: 8, weightKg: 80 },
        ],
        'kg',
        t,
      ),
    ).toBe('12, 10, 8 reps @ 80 kg');
  });

  it('lists the weights too when they differ between sets', () => {
    expect(
      formatSetBreakdown(
        [
          { reps: 10, weightKg: 80 },
          { reps: 10, weightKg: 70 },
        ],
        'kg',
        t,
      ),
    ).toBe('2 × 10 reps @ 80, 70 kg');
  });

  it('omits the load for a bodyweight exercise', () => {
    expect(formatSetBreakdown([{ reps: 15 }, { reps: 15 }], 'kg', t)).toBe('2 × 15 reps');
  });

  it('reports a timed exercise in seconds', () => {
    expect(
      formatSetBreakdown(
        [
          { reps: 0, durationSeconds: 45 },
          { reps: 0, durationSeconds: 45 },
        ],
        'kg',
        t,
      ),
    ).toBe('2 × 45 sec');
  });

  it('converts the load to the chosen unit', () => {
    expect(formatSetBreakdown([{ reps: 10, weightKg: 100 }], 'lb', t)).toBe('1 × 10 reps @ 220.5 lb');
  });

  it('has nothing to say about an empty exercise', () => {
    expect(formatSetBreakdown([], 'kg', t)).toBe('—');
  });
});

describe('formatSignedNumber', () => {
  it('prefixes positive values', () => {
    expect(formatSignedNumber(3)).toBe('+3');
    expect(formatSignedNumber(-2)).toBe('-2');
    expect(formatSignedNumber(0)).toBe('0');
    expect(formatSignedNumber(3.5, 1)).toBe('+3.5');
  });
});
