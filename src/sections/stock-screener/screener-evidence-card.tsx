import type { ScreenerFilters, StockScreenerItem } from 'src/api/screener';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fNumber, fPctChg, fWanYuan, fRatePercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { buildScreenerEvidence } from './screener-evidence';

// ----------------------------------------------------------------------

type ScreenerEvidenceCardProps = {
  item: StockScreenerItem;
  executedFilters: ScreenerFilters;
  conceptNames?: Record<string, string>;
};

type MetricProps = {
  label: string;
  value: string;
};

function Metric({ label, value }: MetricProps) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 'fontWeightMedium', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function fPe(value: number | null): string {
  if (value === null) return '—';
  return value < 0 ? '亏损' : fNumber(value);
}

function fClose(value: number | null): string {
  return value === null ? '—' : value.toFixed(2);
}

// ----------------------------------------------------------------------

export function ScreenerEvidenceCard({
  item,
  executedFilters,
  conceptNames = {},
}: ScreenerEvidenceCardProps) {
  const evidence = buildScreenerEvidence(item, executedFilters, conceptNames);
  const pctColor =
    (item.pctChg ?? 0) > 0 ? 'error' : (item.pctChg ?? 0) < 0 ? 'success' : 'default';

  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, boxShadow: 'none' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
            <Typography variant="subtitle1">{item.name ?? '—'}</Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
            >
              {item.tsCode}
            </Typography>
            {item.industry ? <Chip label={item.industry} size="small" variant="outlined" /> : null}
            {item.market ? <Chip label={item.market} size="small" variant="outlined" /> : null}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            <Typography
              variant="h6"
              sx={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}
            >
              {fClose(item.close)}
            </Typography>
            <Label variant="soft" color={pctColor}>
              {fPctChg(item.pctChg)}
            </Label>
          </Stack>
        </Box>

        <Button
          component={RouterLink}
          href={`/stock/detail?code=${encodeURIComponent(item.tsCode)}`}
          size="small"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
          sx={{ flexShrink: 0 }}
        >
          个股详情
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(5, minmax(0, 1fr))',
          },
          gap: 1.5,
          mt: 2,
        }}
      >
        <Metric label="总市值" value={fWanYuan(item.totalMv)} />
        <Metric label="PE TTM" value={fPe(item.peTtm)} />
        <Metric label="PB" value={fPe(item.pb)} />
        <Metric label="股息率" value={fRatePercent(item.dvTtm)} />
        <Metric label="换手率" value={fRatePercent(item.turnoverRate)} />
      </Box>

      {evidence.length > 0 ? (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            条件证据
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1,
            }}
          >
            {evidence.map((entry) => (
              <Box
                key={entry.key}
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.neutral',
                }}
              >
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {entry.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {entry.target}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ mt: 0.25, fontWeight: 'fontWeightMedium', fontVariantNumeric: 'tabular-nums' }}
                >
                  {entry.verified ? '服务端已校验' : entry.actual}
                </Typography>
                {entry.financial === true && item.latestFinDate ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                    财报期 {fDate(item.latestFinDate, 'YYYY-MM-DD')}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Box>
        </>
      ) : null}
    </Card>
  );
}
