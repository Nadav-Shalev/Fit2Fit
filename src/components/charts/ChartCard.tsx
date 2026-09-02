import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Card wrapper giving every chart the same heading treatment. */
export function ChartCard({ title, subtitle, action, children }: ChartCardProps) {
  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{title}</h3>
          {subtitle ? <p className="text-muted mt-0.5 text-xs">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </Card>
  );
}
