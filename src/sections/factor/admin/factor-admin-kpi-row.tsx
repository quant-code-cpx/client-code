import type { PrecomputeStatusItem } from 'src/api/factor';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

export type KpiData = {
  total: number;
  fresh: number;
  stale: number;
  failed: number;
};

type Props = {
  items: PrecomputeStatusItem[];
  onFilterStatus?: (status: string) => void;
};

type KpiItem = {
  label: string;
  value: number;
  color: 'primary' | 'success' | 'warning' | 'error';
  status?: string;
};

export function deriveKpi(items: PrecomputeStatusItem[] | null | undefined): KpiData {
  const safeItems = Array.isArray(items) ? items : [];
  let fresh = 0;
  let stale = 0;
  let failed = 0;
  for (const item of safeItems) {
    const status = item.status?.toUpperCase();
    if (status === 'UP_TO_DATE' || status === 'FRESH') fresh += 1;
    else if (status === 'STALE') stale += 1;
    else if (status === 'FAILED') failed += 1;
  }
  return { total: safeItems.length, fresh, stale, failed };
}

export function FactorAdminKpiRow({ items, onFilterStatus }: Props) {
  const kpi = deriveKpi(items);
  const kpiItems: KpiItem[] = [
    { label: '因子总数', value: kpi.total, color: 'primary' },
    { label: '最新', value: kpi.fresh, color: 'success', status: 'UP_TO_DATE' },
    { label: '滞后', value: kpi.stale, color: 'warning', status: 'STALE' },
    { label: '失败', value: kpi.failed, color: 'error', status: 'FAILED' },
  ];

  return (
    <Card
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        overflow: 'hidden',
      }}
    >
      {kpiItems.map((item, index) => {
        const canFilter = Boolean(item.status && onFilterStatus);
        return (
          <Box
            key={item.label}
            component={canFilter ? 'button' : 'div'}
            type={canFilter ? 'button' : undefined}
            onClick={canFilter ? () => onFilterStatus?.(item.status as string) : undefined}
            sx={(theme) => ({
              minHeight: 82,
              px: 2.5,
              py: 1.5,
              textAlign: 'left',
              border: 0,
              borderRight: {
                xs: index % 2 === 0 ? `1px solid ${theme.vars.palette.divider}` : 0,
                md: index < 3 ? `1px solid ${theme.vars.palette.divider}` : 0,
              },
              borderBottom: {
                xs: index < 2 ? `1px solid ${theme.vars.palette.divider}` : 0,
                md: 0,
              },
              bgcolor: 'background.paper',
              cursor: canFilter ? 'pointer' : 'default',
              '&:hover': canFilter ? { bgcolor: 'action.hover' } : undefined,
            })}
          >
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
            <Typography
              variant="h4"
              sx={(theme) => ({
                color: theme.vars.palette[item.color].dark,
                mt: 0.25,
                fontVariantNumeric: 'tabular-nums',
                ...theme.applyStyles('dark', {
                  color: theme.vars.palette[item.color].light,
                }),
              })}
            >
              {item.value.toLocaleString()}
            </Typography>
          </Box>
        );
      })}
    </Card>
  );
}
