import type { PrecomputeStatusItem } from 'src/api/factor';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { keyframes } from '@mui/system';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ─── Types ────────────────────────────────────────────────────

export type KpiData = {
  total: number;
  fresh: number;
  stale: number;
  failed: number;
};

type KpiCardProps = {
  label: string;
  value: number;
  color: 'success' | 'warning' | 'error' | 'info' | 'primary';
  /** pulse = 慢呼吸动画（失败卡专用） */
  pulse?: boolean;
  onClick?: () => void;
};

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`;

function KpiCard({ label, value, color, pulse: doPulse, onClick }: KpiCardProps) {
  const theme = useTheme();
  return (
    <Card
      onClick={onClick}
      sx={{
        flex: 1,
        minWidth: 140,
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `3px solid ${theme.palette[color].main}`,
        transition: 'box-shadow 150ms',
        '&:hover': onClick
          ? { boxShadow: theme.customShadows?.z16 ?? theme.shadows[8] }
          : undefined,
        animation: doPulse && value > 0 ? `${pulse} 1.6s ease-in-out infinite` : undefined,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Barlow", sans-serif',
            fontWeight: 700,
            fontSize: 32,
            color: `${color}.main`,
            lineHeight: 1.2,
          }}
        >
          {value.toLocaleString()}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
          {label}
        </Typography>
      </Box>
    </Card>
  );
}

// ─── Public ───────────────────────────────────────────────────

type Props = {
  items: PrecomputeStatusItem[];
  onFilterStatus?: (status: string) => void;
};

export function deriveKpi(items: PrecomputeStatusItem[] | null | undefined): KpiData {
  const safe = Array.isArray(items) ? items : [];
  let fresh = 0;
  let stale = 0;
  let failed = 0;
  for (const it of safe) {
    const s = it.status?.toUpperCase();
    if (s === 'UP_TO_DATE' || s === 'FRESH') fresh += 1;
    else if (s === 'STALE') stale += 1;
    else if (s === 'FAILED') failed += 1;
  }
  return { total: safe.length, fresh, stale, failed };
}

export function FactorAdminKpiRow({ items, onFilterStatus }: Props) {
  const kpi = deriveKpi(items);

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      <KpiCard label="因子总数" value={kpi.total} color="primary" />
      <KpiCard
        label="最新"
        value={kpi.fresh}
        color="success"
        onClick={() => onFilterStatus?.('UP_TO_DATE')}
      />
      <KpiCard
        label="滞后"
        value={kpi.stale}
        color="warning"
        onClick={() => onFilterStatus?.('STALE')}
      />
      <KpiCard
        label="失败"
        value={kpi.failed}
        color="error"
        pulse
        onClick={() => onFilterStatus?.('FAILED')}
      />
    </Stack>
  );
}
