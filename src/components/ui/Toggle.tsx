import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

/** Switch with its label, used throughout settings and the exercise editor. */
export function Toggle({ checked, onChange, label, hint, disabled = false }: ToggleProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-4 py-1',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="text-muted mt-0.5 block text-xs">{hint}</span> : null}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-1 size-5 rounded-full bg-white transition-all',
            // Positioned with logical properties so the knob slides the correct
            // way in both reading directions.
            checked ? 'start-6' : 'start-1',
          )}
        />
      </button>
    </label>
  );
}
