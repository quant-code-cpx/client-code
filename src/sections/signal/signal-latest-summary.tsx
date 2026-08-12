import type { LatestSignalResponse } from 'src/api/signal';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';
import { fNumber, fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
  data: LatestSignalResponse;
  onJumpToAction?: (action: 'BUY' | 'SELL' | 'HOLD') => void;
};

type Counters = { buy: number; sell: number; hold: number; total: number };

function countSignals(items: LatestSignalResponse['signals']): Counters {
  const acc: Counters = { buy: 0, sell: 0, hold: 0, total: items.length };
  items.forEach((s) => {
    if (s.action === 'BUY') acc.buy += 1;
    else if (s.action === 'SELL') acc.sell += 1;
    else acc.hold += 1;
  });
  return acc;
}

function formatGeneratedAt(iso: string, tradeDate: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString('zh-CN', { hour12: false }).slice(0, 5);
    if (isToday) return `今日 ${time}`;
    if (isYesterday) return `昨日 ${time}`;
    return `${fmtTradeDate(tradeDate)} ${time}`;
  } catch {
    return iso;
  }
}

export function SignalLatestSummary({ data, onJumpToAction }: Props) {
  const theme = useTheme();
  const counts = countSignals(data.signals);

  const items: Array<{
    label: string;
    value: number;
    color: 'success' | 'error' | 'default' | 'info';
    action?: 'BUY' | 'SELL' | 'HOLD';
  }> = [
    { label: '买入', value: counts.buy, color: 'success', action: 'BUY' },
    { label: '卖出', value: counts.sell, color: 'error', action: 'SELL' },
    { label: '持有', value: counts.hold, color: 'default', action: 'HOLD' },
    { label: '总信号', value: counts.total, color: 'info' },
  ];

  const colorChannel = (c: 'success' | 'error' | 'default' | 'info') => {
    if (c === 'success') return theme.vars.palette.success.mainChannel;
    if (c === 'error') return theme.vars.palette.error.mainChannel;
    if (c === 'info') return theme.vars.palette.info.mainChannel;
    return theme.vars.palette.text.secondaryChannel;
  };

  return (
    <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        divider={<Box sx={{ borderLeft: '1px solid', borderColor: 'divider' }} />}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        {items.map((item) => (
          <Box
            key={item.label}
            onClick={item.action && onJumpToAction ? () => onJumpToAction(item.action!) : undefined}
            role={item.action && onJumpToAction ? 'button' : undefined}
            tabIndex={item.action && onJumpToAction ? 0 : undefined}
            aria-label={
              item.action && onJumpToAction ? `查看${item.label}信号：${item.value}` : undefined
            }
            onKeyDown={(event) => {
              if (!item.action || !onJumpToAction || (event.key !== 'Enter' && event.key !== ' '))
                return;
              event.preventDefault();
              onJumpToAction(item.action);
            }}
            sx={{
              flex: 1,
              minWidth: 0,
              pl: 1.5,
              borderLeft: 3,
              borderColor: 'transparent',
              cursor: item.action && onJumpToAction ? 'pointer' : 'default',
              backgroundImage: `linear-gradient(${varAlpha(
                colorChannel(item.color),
                0.06
              )}, ${varAlpha(colorChannel(item.color), 0.0)})`,
              borderRadius: 1,
              transition: 'background 0.2s',
              '&:hover':
                item.action && onJumpToAction
                  ? {
                      backgroundImage: `linear-gradient(${varAlpha(
                        colorChannel(item.color),
                        0.12
                      )}, ${varAlpha(colorChannel(item.color), 0.0)})`,
                    }
                  : undefined,
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2,
              },
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 4,
                bottom: 4,
                width: 3,
                bgcolor: varAlpha(colorChannel(item.color), 0.6),
                borderRadius: 1,
              },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
              {item.label}
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontFeatureSettings: '"tnum"', fontWeight: 700, lineHeight: 1.2 }}
            >
              {fNumber(item.value)}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px dashed',
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          rowGap: 0.5,
        }}
      >
        <MetaItem label="数据日" value={fmtTradeDate(data.tradeDate)} />
        <MetaItem label="生成时间" value={formatGeneratedAt(data.generatedAt, data.tradeDate)} />
        <MetaItem
          label="关联组合"
          value={
            data.portfolioName
              ? `${data.portfolioName}${
                  data.portfolioMarketValue != null
                    ? ` · 市值 ${fCurrency(data.portfolioMarketValue, { maximumFractionDigits: 0 })}`
                    : ''
                }`
              : '未关联'
          }
        />
        <MetaItem label="基准" value={data.benchmarkName ?? data.benchmarkTsCode ?? '—'} />
      </Box>
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}
