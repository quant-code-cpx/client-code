import { memo } from 'react';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import * as numberFormat from 'src/utils/format-number';

import { Label } from 'src/components/label';

import { useRealtimeQuote } from './hooks/use-realtime-quote';

// ----------------------------------------------------------------------

type LimitStatus = { label: string; color: 'error' | 'success' } | null;

type Props = {
  tsCode: string;
  snapshotPrice: number | null | undefined;
  snapshotPctChg: number | null | undefined;
  snapshotChange: number | null | undefined;
  limitStatus: LimitStatus;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function RealtimeQuoteBadgeComponent({
  tsCode,
  snapshotPrice,
  snapshotPctChg,
  snapshotChange,
  limitStatus,
}: Props) {
  const { quote, dataTime, session, isLive, isStale } = useRealtimeQuote(tsCode);

  const price = isLive && quote ? quote.price : snapshotPrice;
  const pctChg = isLive && quote ? quote.changePercent : snapshotPctChg;
  const change = isLive && quote ? quote.change : snapshotChange;

  const isUp = (pctChg ?? 0) > 0;
  const isDown = (pctChg ?? 0) < 0;
  const priceColor = isUp ? 'error.main' : isDown ? 'success.main' : 'text.primary';
  const pctChgLabelColor = isUp ? 'error' : isDown ? 'success' : 'default';

  const status: { label: string; color: 'success' | 'warning' | 'default'; tip: string } = isLive
    ? isStale
      ? { label: '延迟', color: 'warning', tip: '实时数据刷新延迟，展示最近一次结果' }
      : { label: '实时', color: 'success', tip: '行情每 15 秒自动刷新（数据有数十秒延迟）' }
    : session === 'open'
      ? { label: '快照', color: 'default', tip: '实时行情暂不可用，展示最新交易日快照' }
      : { label: '收盘价', color: 'default', tip: '当前为非交易时段，展示最新交易日收盘数据' };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography
          key={dataTime ?? 'snapshot'}
          variant="h3"
          sx={{
            color: priceColor,
            fontWeight: 'fontWeightBold',
            animation: isLive && dataTime ? 'rt-quote-fade 200ms ease-out' : 'none',
            '@keyframes rt-quote-fade': {
              from: { opacity: 0.45 },
              to: { opacity: 1 },
            },
          }}
        >
          {numberFormat.fNumber(price)}
        </Typography>
        <Label variant="filled" color={pctChgLabelColor} sx={{ fontSize: 14, px: 1.5, py: 0.5 }}>
          {numberFormat.fPctChg(pctChg)}
        </Label>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          涨跌额 {numberFormat.fNumber(change)}
        </Typography>
        {limitStatus && (
          <Label variant="soft" color={limitStatus.color} sx={{ fontSize: 12, px: 1.25 }}>
            {limitStatus.label}
          </Label>
        )}
        <Tooltip title={status.tip} arrow>
          <Box component="span" sx={{ display: 'inline-flex' }}>
            <Label variant="soft" color={status.color} sx={{ fontSize: 12, px: 1.25 }}>
              {status.label}
            </Label>
          </Box>
        </Tooltip>
        {isLive && dataTime && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {formatTime(dataTime)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export const RealtimeQuoteBadge = memo(RealtimeQuoteBadgeComponent);
