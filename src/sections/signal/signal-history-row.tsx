import type { TradingSignalItem, SignalForwardWindow } from 'src/api/signal';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { SignalReturnText } from './signal-return-text';

// ----------------------------------------------------------------------

type Props = {
  signal: TradingSignalItem;
  tradeDate: string;
  forwardWindow: SignalForwardWindow;
  alertThreshold?: number;
};

const ACTION_META = {
  BUY: { label: '买入', color: 'success' as const },
  SELL: { label: '卖出', color: 'error' as const },
  HOLD: { label: '持有', color: 'default' as const },
};

export function SignalHistoryRow({
  signal,
  tradeDate,
  forwardWindow,
  alertThreshold = 0.6,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasReason = Boolean(signal.reason?.length);
  const repeated = signal.isFirstOccurrence === false;
  const stockHref = `/stock/detail?code=${encodeURIComponent(signal.tsCode)}&date=${tradeDate}`;

  const handleToggleReason = () => {
    if (hasReason) setOpen((prev) => !prev);
  };

  return (
    <>
      <TableRow
        hover
        role={hasReason ? 'button' : undefined}
        tabIndex={hasReason ? 0 : undefined}
        aria-expanded={hasReason ? open : undefined}
        aria-label={hasReason ? `${signal.stockName} 信号触发原因` : undefined}
        onClick={handleToggleReason}
        onKeyDown={(event) => {
          if (!hasReason || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          handleToggleReason();
        }}
        sx={(theme) => ({
          opacity: repeated ? 0.8 : 1,
          cursor: hasReason ? 'pointer' : 'default',
          bgcolor: repeated ? varAlpha(theme.vars.palette.text.primaryChannel, 0.03) : 'inherit',
        })}
      >
        <TableCell>
          <Link
            component={RouterLink}
            href={stockHref}
            underline="hover"
            onClick={(event) => event.stopPropagation()}
            sx={{ fontFamily: 'monospace', fontSize: 13 }}
          >
            {signal.tsCode}
          </Link>
        </TableCell>
        <TableCell>
          <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
            {signal.stockName}
          </Typography>
          {repeated && (
            <Typography variant="caption" color="text.secondary">
              持续信号
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Label color={ACTION_META[signal.action].color} variant="soft">
            {ACTION_META[signal.action].label}
          </Label>
        </TableCell>
        <TableCell align="right" sx={numericSx}>
          {formatWeight(signal.currentWeight)}
        </TableCell>
        <TableCell align="right" sx={numericSx}>
          {formatWeight(signal.targetWeight)}
        </TableCell>
        <TableCell align="right">
          {signal.confidence !== null && signal.confidence !== undefined ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.round(signal.confidence * 100)}
                color={signal.confidence >= alertThreshold ? 'success' : 'warning'}
                sx={{ width: 48, height: 6, borderRadius: 1 }}
              />
              <Typography variant="body2" sx={{ minWidth: 42, textAlign: 'right', ...numericSx }}>
                {(signal.confidence * 100).toFixed(0)}%
              </Typography>
            </Box>
          ) : (
            '—'
          )}
        </TableCell>
        <TableCell align="right">
          <SignalReturnText value={signal.forwardReturn?.d1} />
        </TableCell>
        <TableCell align="right">
          <SignalReturnText
            value={signal.forwardReturn?.d5}
            sx={forwardWindow === 5 ? { fontWeight: 700 } : undefined}
          />
        </TableCell>
        <TableCell align="right">
          <SignalReturnText value={signal.forwardReturn?.d20} />
        </TableCell>
        <TableCell align="right">
          <SignalReturnText value={getExcessReturn(signal, forwardWindow)} />
        </TableCell>
        <TableCell align="right">
          <Tooltip title={`打开 ${signal.stockName} 个股详情`}>
            <IconButton
              component={RouterLink}
              href={stockHref}
              size="small"
              aria-label={`打开 ${signal.stockName} 个股详情`}
              onClick={(event) => event.stopPropagation()}
            >
              <Iconify icon="solar:arrow-right-bold" width={16} />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {hasReason && (
        <TableRow>
          <TableCell colSpan={11} sx={{ py: 0, borderBottom: 0 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5, pl: 2, color: 'text.secondary' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  信号触发原因 / 因子贡献
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {signal.reason?.map((item) => (
                    <Label
                      key={item.factor}
                      color={item.contribution >= 0 ? 'success' : 'error'}
                      variant="soft"
                    >
                      {item.factor} {item.contribution >= 0 ? '+' : ''}
                      {(item.contribution * 100).toFixed(1)}%
                    </Label>
                  ))}
                </Box>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

const numericSx = {
  fontFeatureSettings: '"tnum"',
  fontVariantNumeric: 'tabular-nums',
};

function formatWeight(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function getExcessReturn(signal: TradingSignalItem, window: SignalForwardWindow) {
  if (window === 1) return signal.excessReturn?.d1;
  if (window === 20) return signal.excessReturn?.d20;
  return signal.excessReturn?.d5;
}
