import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface NumberStepperProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Number entry with large increment and decrement targets.
 *
 * Typing is still possible, but mid-set the buttons are what get used, so they
 * are sized for a thumb rather than a mouse pointer.
 */
export function NumberStepper({
  value,
  onChange,
  label,
  step = 1,
  min = 0,
  max = 9999,
  placeholder,
  disabled = false,
  size = 'md',
  className,
}: NumberStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const nudge = (delta: number) => {
    onChange(clamp((value ?? 0) + delta));
  };

  const height = size === 'sm' ? 'h-9' : 'h-11';
  const buttonSize = size === 'sm' ? 'size-9' : 'size-11';

  return (
    <div
      className={cn(
        'bg-elevated border-line flex items-center overflow-hidden rounded-xl border',
        height,
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        aria-label={`${label} -`}
        disabled={disabled || (value ?? 0) <= min}
        onClick={() => nudge(-step)}
        className={cn(
          'text-muted hover:text-fg hover:bg-surface flex shrink-0 items-center justify-center transition-colors disabled:opacity-30',
          buttonSize,
        )}
      >
        <Minus size={size === 'sm' ? 16 : 18} />
      </button>

      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        disabled={disabled}
        value={value ?? ''}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          if (raw === '') {
            onChange(undefined);
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) onChange(clamp(parsed));
        }}
        className={cn(
          'placeholder:text-muted/50 min-w-0 flex-1 bg-transparent text-center font-bold tabular-nums focus:outline-none',
          size === 'sm' ? 'text-sm' : 'text-base',
        )}
      />

      <button
        type="button"
        aria-label={`${label} +`}
        disabled={disabled || (value ?? 0) >= max}
        onClick={() => nudge(step)}
        className={cn(
          'text-muted hover:text-fg hover:bg-surface flex shrink-0 items-center justify-center transition-colors disabled:opacity-30',
          buttonSize,
        )}
      >
        <Plus size={size === 'sm' ? 16 : 18} />
      </button>
    </div>
  );
}
