import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useToastStore, type ToastTone } from '@/store/useToastStore';
import { cn } from '@/utils/cn';

const TONES: Record<ToastTone, string> = {
  success: 'border-primary/40 text-primary',
  error: 'border-danger/40 text-danger',
  info: 'border-line text-fg',
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') return <CheckCircle2 size={18} />;
  if (tone === 'error') return <AlertCircle size={18} />;
  return <Info size={18} />;
}

/** Fixed toast stack, kept clear of the bottom navigation on mobile. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={cn(
            'bg-surface animate-slide-up pointer-events-auto flex w-full max-w-sm items-center gap-2.5',
            'rounded-2xl border px-4 py-3 text-start text-sm font-medium shadow-card',
            TONES[toast.tone],
          )}
        >
          <ToastIcon tone={toast.tone} />
          <span className="text-fg flex-1">{toast.message}</span>
        </button>
      ))}
    </div>
  );
}
