import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const CONTROL_CLASSES =
  'bg-elevated border-line placeholder:text-muted/60 w-full rounded-xl border px-3 text-base ' +
  'transition-colors focus:border-primary focus:outline-none disabled:opacity-50';

interface FieldShellProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/** Shared label / hint / error wrapper so every form control looks the same. */
export function FieldShell({ label, hint, error, htmlFor, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-muted text-sm font-medium">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-danger text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function TextField({ label, hint, error, className, id, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <input
        id={fieldId}
        className={cn(CONTROL_CLASSES, 'h-11', error ? 'border-danger' : null, className)}
        {...rest}
      />
    </FieldShell>
  );
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
}

export function TextAreaField({ label, hint, className, id, ...rest }: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell label={label} hint={hint} htmlFor={fieldId}>
      <textarea id={fieldId} rows={3} className={cn(CONTROL_CLASSES, 'py-2.5', className)} {...rest} />
    </FieldShell>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}

export function SelectField({ label, hint, className, id, children, ...rest }: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell label={label} hint={hint} htmlFor={fieldId}>
      <select id={fieldId} className={cn(CONTROL_CLASSES, 'h-11', className)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}
