import { describe, expect, it } from 'vitest';
import { makeRunningSession } from '@/test/factories';
import { formatPace } from '@/utils/format';
import {
  averagePace,
  calcPaceSecondsPerKm,
  calcSpeedKmh,
  sumRunningDistance,
  sumRunningDuration,
} from './running';

describe('calcPaceSecondsPerKm', () => {
  it('divides duration by distance', () => {
    // 24:15 over 3.2 km is 7:35 per km.
    const pace = calcPaceSecondsPerKm(24 * 60 + 15, 3.2);
    expect(pace).toBeCloseTo(454.6875, 4);
    expect(formatPace(pace)).toBe('7:35');
  });

  it('returns undefined without a distance rather than dividing by zero', () => {
    expect(calcPaceSecondsPerKm(1500, 0)).toBeUndefined();
    expect(calcPaceSecondsPerKm(1500, undefined)).toBeUndefined();
  });

  it('returns undefined for a zero or negative duration', () => {
    expect(calcPaceSecondsPerKm(0, 5)).toBeUndefined();
    expect(calcPaceSecondsPerKm(-10, 5)).toBeUndefined();
  });
});

describe('calcSpeedKmh', () => {
  it('converts a 6:00 min/km pace to 10 km/h', () => {
    expect(calcSpeedKmh(3600, 10)).toBeCloseTo(10, 6);
  });
});

describe('running totals', () => {
  const runs = [
    makeRunningSession({ distanceKm: 3.1, durationSeconds: 1620 }),
    makeRunningSession({ distanceKm: 5.25, durationSeconds: 2400 }),
    makeRunningSession({ durationSeconds: 600, distanceKm: undefined }),
  ];

  it('sums distance, treating runs without a distance as zero', () => {
    expect(sumRunningDistance(runs)).toBe(8.35);
  });

  it('sums duration across every run', () => {
    expect(sumRunningDuration(runs)).toBe(4620);
  });

  it('weights average pace by distance rather than averaging paces', () => {
    const pace = averagePace(runs);
    // (1620 + 2400) / (3.1 + 5.25) — the distance-less run is excluded.
    expect(pace).toBeCloseTo(4020 / 8.35, 6);
  });

  it('returns undefined average pace when no run has a distance', () => {
    expect(averagePace([makeRunningSession({ distanceKm: undefined })])).toBeUndefined();
  });
});
