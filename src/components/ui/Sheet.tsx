import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n';
import { IconButton } from './IconButton';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Sticky action row pinned to the bottom of the sheet. */
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * Bottom sheet on mobile, centred dialog from `sm` upwards.
 *
 * One component covers both because the content is identical; only the
 * placement changes, which keeps every form in the app consistent.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: SheetProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // Prevent the page behind the sheet from scrolling with it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'bg-surface border-line animate-slide-up relative flex max-h-[92dvh] w-full flex-col',
          'rounded-t-3xl border shadow-card sm:rounded-3xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <header className="border-line flex items-start justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{title}</h2>
            {description ? <p className="text-muted mt-1 text-sm">{description}</p> : null}
          </div>
          <IconButton label={t('common.close')} icon={<X size={20} />} onClick={onClose} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

        {footer ? (
          <footer className="border-line safe-bottom border-t p-4">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
