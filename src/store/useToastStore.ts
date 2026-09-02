import { create } from 'zustand';
import { createId } from '@/utils/id';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 3500;

/** Transient confirmations — saved, exported, imported, deleted. */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (message, tone = 'success') => {
    const id = createId();
    set({ toasts: [...get().toasts, { id, message, tone }] });
    window.setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));
