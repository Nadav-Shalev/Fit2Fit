import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only control needs an accessible name. */
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger' | 'primary';
  size?: 'sm' | 'md';
}

const TONES = {
  default: 'text-muted hover:text-fg hover:bg-elevated',
  danger: 'text-danger hover:bg-danger-soft',
  primary: 'text-primary hover:bg-primary-soft',
} as const;

export function IconButton({
  label,
  icon,
  tone = 'default',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'size-9' : 'size-11',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
