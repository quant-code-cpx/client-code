import type { RefObject } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { MarketKlineTable } from './market-kline-table';
import { MarketKlineLegend } from './market-kline-legend';

import type {
  MarketPeriod,
  MarketKLineData,
  MarketChartStatus,
} from './market-kline.types';

type Props = {
  tsCode: string;
  period: MarketPeriod;
  status: MarketChartStatus;
  message: string;
  bars: MarketKLineData[];
  legendBar: MarketKLineData | null;
  hostRef: RefObject<HTMLDivElement | null>;
  focusColor: string;
  onRetry: () => void;
};

export function MarketKlinePanel({
  tsCode,
  period,
  status,
  message,
  bars,
  legendBar,
  hostRef,
  focusColor,
  onRetry,
}: Props) {
  const showLoading = status === 'loading';
  const showBlockingState = status === 'empty' || status === 'error';

  return (
    <Box>
      <MarketKlineLegend bar={legendBar} period={period} />
      {(status === 'partial' || status === 'stale') && message ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {message}
        </Alert>
      ) : null}

      <Box sx={{ position: 'relative', minHeight: 540 }}>
        <Box
          ref={hostRef}
          role="img"
          aria-busy={showLoading}
          aria-label={`${tsCode} ${period === 'T' ? '分时' : 'K 线'}行情图`}
          sx={{
            height: 540,
            width: 1,
            '& > div:focus-visible': {
              outline: `2px solid ${focusColor}`,
              outlineOffset: -2,
            },
          }}
        />

        {showLoading ? (
          <Box aria-live="polite" sx={{ position: 'absolute', inset: 0 }}>
            <Skeleton variant="rectangular" height={540} sx={{ borderRadius: 1.5 }} />
            <Typography
              variant="body2"
              sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}
            >
              行情加载中…
            </Typography>
          </Box>
        ) : null}

        {showBlockingState ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              bgcolor: 'background.paper',
              overflowWrap: 'anywhere',
            }}
            aria-live="polite"
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {status === 'empty' ? '当前周期暂无可用行情数据' : message}
            </Typography>
            {status === 'error' ? (
              <Button size="small" variant="outlined" onClick={onRetry}>
                重新加载
              </Button>
            ) : null}
          </Box>
        ) : null}
      </Box>

      {bars.length > 0 ? <MarketKlineTable tsCode={tsCode} period={period} bars={bars} /> : null}
    </Box>
  );
}
