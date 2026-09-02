import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * Application frame: sidebar on desktop, bottom navigation on mobile.
 *
 * The bottom padding keeps the last card clear of the fixed navigation, which
 * matters most on the workout screen where the finish button lives down there.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:ps-60">
      <Sidebar />
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 pb-28 lg:pb-10">{children}</main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
