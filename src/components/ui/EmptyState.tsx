import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Shown wherever a list can legitimately be empty — no programs, no history,
 * no chart data. Always says what to do next rather than just "no data".
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-line flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? <div className="text-muted mb-3">{icon}</div> : null}
      <h3 className="font-semibold">{title}</h3>
      {description ? (
        <p className="text-muted mt-1.5 max-w-xs text-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
