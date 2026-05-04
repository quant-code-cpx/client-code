import type { ReportType, ReportStatus } from 'src/api/report';

import { Label } from 'src/components/label';

import { REPORT_TYPE_LABELS, REPORT_TYPE_COLORS, REPORT_STATUS_CONFIG } from '../constants';

type LabelColor = 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

const TYPE_COLOR_MAP: Record<ReportType, LabelColor> = {
  BACKTEST: 'primary',
  STOCK: 'info',
  PORTFOLIO: 'warning',
  STRATEGY_RESEARCH: 'secondary',
};

const STATUS_COLOR_MAP: Record<ReportStatus, LabelColor> = {
  PENDING: 'default',
  GENERATING: 'warning',
  COMPLETED: 'success',
  FAILED: 'error',
};

export function ReportTypeChip({ type }: { type: ReportType }) {
  const color = TYPE_COLOR_MAP[type] ?? (REPORT_TYPE_COLORS[type] as LabelColor);
  return <Label color={color}>{REPORT_TYPE_LABELS[type] ?? type}</Label>;
}

export function ReportStatusChip({ status }: { status: ReportStatus }) {
  const cfg = REPORT_STATUS_CONFIG[status];
  const color: LabelColor = STATUS_COLOR_MAP[status] ?? 'default';
  return (
    <Label
      color={color}
      sx={
        status === 'GENERATING'
          ? {
              animation: 'reportPulse 1.6s ease-in-out infinite',
              '@keyframes reportPulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.55 },
              },
            }
          : undefined
      }
    >
      {cfg?.label ?? status}
    </Label>
  );
}
