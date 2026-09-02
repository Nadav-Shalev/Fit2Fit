import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes the default padding for cards that manage their own layout. */
  flush?: boolean;
  children: ReactNode;
}

export function Card({ flush = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border-line rounded-2xl border',
        !flush && 'p-4',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold">{title}</h2>
        {subtitle ? <p className="text-muted mt-0.5 text-sm">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
