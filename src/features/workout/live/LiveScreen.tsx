import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface LiveScreenProps {
  /** Fills the screen and is vertically centred; keep it to the essentials. */
  children: ReactNode;
  /** Pinned to the bottom, within thumb reach. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Layout shared by every focused workout screen: one centred block of large
 * type, and the primary action pinned low where a thumb naturally rests.
 */
export function LiveScreen({ children, actions, className }: LiveScreenProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 text-center',
          className,
        )}
      >
        {children}
      </div>

      {actions ? (
        <div className="safe-bottom flex shrink-0 flex-col gap-3 px-5 pt-4 pb-5">{actions}</div>
      ) : null}
    </div>
  );
}

/** A large monospaced timer. Forced LTR so a clock never reverses in Hebrew. */
export function LiveClock({ value, tone = 'default' }: { value: string; tone?: 'default' | 'primary' | 'muted' }) {
  return (
    <p
      dir="ltr"
      className={cn(
        'text-7xl font-extrabold tabular-nums sm:text-8xl',
        tone === 'primary' && 'text-primary',
        tone === 'muted' && 'text-muted',
      )}
    >
      {value}
    </p>
  );
}
