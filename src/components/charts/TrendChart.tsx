import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendChartProps {
  data: TrendPoint[];
  type?: 'line' | 'bar';
  /** Any CSS colour; the design tokens are passed in as custom properties. */
  color?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  /** Lower bound; pace charts read better when the axis is not forced to zero. */
  domainFromZero?: boolean;
}

const AXIS_STYLE = { fontSize: 11, fill: 'var(--app-muted)' } as const;

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: TooltipProps<number, string> & { formatter: (value: number) => string }) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;

  return (
    <div className="bg-elevated border-line rounded-xl border px-3 py-2 text-xs shadow-card">
      <p className="text-muted">{label}</p>
      <p className="mt-0.5 font-bold tabular-nums">
        {typeof value === 'number' ? formatter(value) : '—'}
      </p>
    </div>
  );
}

/**
 * Single-series trend chart.
 *
 * Rendered left-to-right regardless of page direction: a time axis reads
 * chronologically in both languages, and Recharts assumes LTR internally.
 */
export function TrendChart({
  data,
  type = 'line',
  color = 'var(--app-primary)',
  valueFormatter = (value) => String(value),
  height = 200,
  domainFromZero = true,
}: TrendChartProps) {
  const commonAxes = (
    <>
      <CartesianGrid stroke="var(--app-line)" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
      <YAxis
        tick={AXIS_STYLE}
        tickLine={false}
        axisLine={false}
        width={44}
        domain={domainFromZero ? [0, 'auto'] : ['auto', 'auto']}
        tickFormatter={(value: number) => valueFormatter(value)}
      />
      <Tooltip
        cursor={{ fill: 'var(--app-elevated)', stroke: 'var(--app-line)' }}
        content={<ChartTooltip formatter={valueFormatter} />}
      />
    </>
  );

  return (
    <div className="ltr-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {commonAxes}
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={38} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {commonAxes}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
