import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Secondary line, typically a comparison against the previous period. */
  delta?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'primary' | 'run';
  className?: string;
}

const TONES = {
  default: 'text-fg',
  primary: 'text-primary',
  run: 'text-run',
} as const;

/** Single figure with its label — the building block of every summary block. */
export function StatTile({ label, value, delta, icon, tone = 'default', className }: StatTileProps) {
  return (
    <div className={cn('bg-surface border-line rounded-2xl border p-3.5', className)}>
      <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-1.5 text-xl font-bold tabular-nums', TONES[tone])}>{value}</div>
      {delta ? <div className="text-muted mt-0.5 text-xs tabular-nums">{delta}</div> : null}
    </div>
  );
}
