import type { ReactNode } from 'react';

export interface ProgressRingProps {
  /** 0-100; values above 100 are clamped so the ring cannot overdraw. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
  tone?: 'primary' | 'run';
}

/** Circular completion indicator used for weekly adherence and rest timers. */
export function ProgressRing({
  percent,
  size = 72,
  strokeWidth = 7,
  children,
  tone = 'primary',
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      {/* Rotated so the arc starts at twelve o'clock and sweeps clockwise. */}
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={tone === 'run' ? 'stroke-run' : 'stroke-primary'}
          style={{ transition: 'stroke-dashoffset 0.35s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
