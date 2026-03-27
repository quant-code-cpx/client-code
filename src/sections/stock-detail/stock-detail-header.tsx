import type { StockDetailOverviewData } from 'src/api/stock';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { fNumber, fPctChg, fWanYuan, fRatePercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  tsCode: string;
  overview: StockDetailOverviewData | null;
  loading: boolean;
};

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 88 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="fontWeightMedium">
        {value}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function StockDetailHeader({ tsCode, overview, loading }: Props) {
  const basic = overview?.basic as Record<string, unknown> | null | undefined;
  const quote = overview?.latestQuote as Record<string, unknown> | null | undefined;
  const valuation = overview?.latestValuation as Record<string, unknown> | null | undefined;

  const name = (basic?.name ?? basic?.shortName ?? '-') as string;
  const exchange = (basic?.exchange ?? '-') as string;
  const market = (basic?.market ?? '-') as string;

  const close = quote?.close as number | null | undefined;
  const pctChg = quote?.pctChg as number | null | undefined;
  const preClose = quote?.preClose as number | null | undefined;
  const high = quote?.high as number | null | undefined;
  const low = quote?.low as number | null | undefined;
  const open = quote?.open as number | null | undefined;
  const vol = quote?.vol as number | null | undefined;
  const amount = quote?.amount as number | null | undefined;
  const turnoverRate = quote?.turnoverRate as number | null | undefined;

  const peTtm = valuation?.peTtm as number | null | undefined;
  const pb = valuation?.pb as number | null | undefined;
  const totalMv = valuation?.totalMv as number | null | undefined;
  const circMv = valuation?.circMv as number | null | undefined;

  const isUp = (pctChg ?? 0) > 0;
  const isDown = (pctChg ?? 0) < 0;
  const priceColor = isUp ? 'error.main' : isDown ? 'success.main' : 'text.primary';
  const pctChgLabelColor = isUp ? 'error' : isDown ? 'success' : 'default';

  if (loading) {
    return (
      <Box sx={{ mb: 3 }}>
        <Skeleton width={240} height={36} />
        <Skeleton width={160} height={24} sx={{ mt: 1 }} />
        <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} width={80} height={48} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* 股票名称 + 代码 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="h4">{name}</Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {tsCode}
        </Typography>
        {exchange && (
          <Chip label={exchange} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
        )}
        {market && (
          <Chip label={market} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
        )}
      </Box>

      {/* 价格 + 涨跌幅 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h3" sx={{ color: priceColor, fontWeight: 'fontWeightBold' }}>
          {fNumber(close)}
        </Typography>
        <Label variant="filled" color={pctChgLabelColor} sx={{ fontSize: 14, px: 1.5, py: 0.5 }}>
          {fPctChg(pctChg)}
        </Label>
      </Box>

      {/* 行情数据指标行 */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <StatItem label="今开" value={fNumber(open)} />
        <StatItem label="昨收" value={fNumber(preClose)} />
        <StatItem label="最高" value={fNumber(high)} />
        <StatItem label="最低" value={fNumber(low)} />
        <StatItem
          label="成交量"
          value={vol != null ? `${fNumber(vol / 100)}手` : '-'}
        />
        <StatItem label="成交额" value={fWanYuan(amount != null ? amount / 10 : null)} />
        <StatItem label="换手率" value={fRatePercent(turnoverRate)} />
        <StatItem label="市盈率(TTM)" value={fNumber(peTtm)} />
        <StatItem label="市净率" value={fNumber(pb)} />
        <StatItem label="总市值" value={fWanYuan(totalMv)} />
        <StatItem label="流通市值" value={fWanYuan(circMv)} />
      </Box>
    </Box>
  );
}
