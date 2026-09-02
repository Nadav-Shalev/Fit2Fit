import { useTranslation } from '@/i18n';
import { RPE_MAX, RPE_MIN, rpeLabelKey } from '@/utils/analytics/rpe';
import { cn } from '@/utils/cn';

export interface RpeScaleProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  /** Allows tapping the selected value again to clear it. */
  clearable?: boolean;
  size?: 'sm' | 'md';
}

const VALUES = Array.from({ length: RPE_MAX - RPE_MIN + 1 }, (_, index) => RPE_MIN + index);

/** Colour ramp from easy to maximal, so the scale is readable at a glance. */
function toneFor(value: number, selected: boolean): string {
  if (!selected) return 'bg-elevated text-muted hover:text-fg';
  if (value <= 2) return 'bg-success text-white';
  if (value <= 4) return 'bg-primary text-primary-fg';
  if (value <= 6) return 'bg-warning text-black';
  if (value <= 8) return 'bg-run text-white';
  return 'bg-danger text-white';
}

/**
 * Numeric effort picker. The stored value is always the number; the descriptive
 * word underneath is there to make the number easier to choose honestly.
 */
export function RpeScale({ value, onChange, clearable = true, size = 'md' }: RpeScaleProps) {
  const { t } = useTranslation();
  const labelKey = value === undefined ? null : rpeLabelKey(value);

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {VALUES.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-label={`${t('rpe.label')} ${option}`}
              aria-pressed={selected}
              onClick={() => onChange(clearable && selected ? undefined : option)}
              className={cn(
                'rounded-xl font-bold tabular-nums transition-colors',
                size === 'sm' ? 'h-10 text-sm' : 'h-12 text-base',
                toneFor(option, selected),
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <p className="text-muted mt-2 h-5 text-center text-sm font-medium">
        {labelKey ? t(labelKey) : ''}
      </p>
    </div>
  );
}
