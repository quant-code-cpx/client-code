import { useId } from 'react';

// ----------------------------------------------------------------------

type ChartSparklineProps = {
  /** Data points; null/undefined values are filtered out. */
  data: (number | null | undefined)[];
  /** Stroke and gradient fill color. */
  color: string;
  /** Height in px (default 28). */
  height?: number;
  /** Show gradient area fill under the line (default true). */
  showArea?: boolean;
};

/**
 * Lightweight SVG sparkline used across dashboard and market-overview cards.
 * Replaces the four near-identical inline implementations that previously
 * lived in: market-daily-snapshot-card, market-hsgt-mini-card,
 * dashboard-market-pulse, and market-index-cards (orphan).
 */
export function ChartSparkline({ data, color, height = 28, showArea = true }: ChartSparklineProps) {
  const gradientId = useId();
  const values = data.filter((v): v is number => v != null);

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const h = height;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      {showArea && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {showArea && <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#${gradientId})`} />}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
