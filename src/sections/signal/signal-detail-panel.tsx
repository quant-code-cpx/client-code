import type { TradingSignalItem } from 'src/api/signal';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const HOLD_COLLAPSE_KEY = 'signal-latest:hold-open';

type Props = {
  signals: TradingSignalItem[];
  /** 关联组合存在则显示 现权重 / 偏离 / 估手数 列 */
  hasPortfolio: boolean;
  /** 接收滚动锚点 */
  registerAnchor?: (action: 'BUY' | 'SELL' | 'HOLD', el: HTMLElement | null) => void;
  /** 复制 CSV 委托清单（仅 BUY/SELL 组显示） */
  onCopyOrders?: () => void;
};

export function SignalDetailPanel({ signals, hasPortfolio, registerAnchor, onCopyOrders }: Props) {
  const buySignals = signals.filter((s) => s.action === 'BUY');
  const sellSignals = signals.filter((s) => s.action === 'SELL');
  const holdSignals = signals.filter((s) => s.action === 'HOLD');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {buySignals.length > 0 && (
        <SignalGroup
          title="BUY 信号"
          action="BUY"
          signals={buySignals}
          defaultOpen
          hasPortfolio={hasPortfolio}
          registerAnchor={registerAnchor}
          onCopyOrders={onCopyOrders}
        />
      )}

      {sellSignals.length > 0 && (
        <SignalGroup
          title="SELL 信号"
          action="SELL"
          signals={sellSignals}
          defaultOpen
          hasPortfolio={hasPortfolio}
          registerAnchor={registerAnchor}
          onCopyOrders={onCopyOrders}
        />
      )}

      {holdSignals.length > 0 && (
        <SignalGroup
          title="HOLD 信号"
          action="HOLD"
          signals={holdSignals}
          defaultOpen={false}
          hasPortfolio={hasPortfolio}
          registerAnchor={registerAnchor}
        />
      )}

      {signals.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          该交易日无信号数据
        </Typography>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

type SignalGroupProps = {
  title: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  signals: TradingSignalItem[];
  defaultOpen: boolean;
  hasPortfolio: boolean;
  registerAnchor?: (action: 'BUY' | 'SELL' | 'HOLD', el: HTMLElement | null) => void;
  onCopyOrders?: () => void;
};

function SignalGroup({
  title,
  action,
  signals,
  defaultOpen,
  hasPortfolio,
  registerAnchor,
  onCopyOrders,
}: SignalGroupProps) {
  const theme = useTheme();

  const initialOpen = (() => {
    if (action !== 'HOLD') return defaultOpen;
    try {
      const v = localStorage.getItem(HOLD_COLLAPSE_KEY);
      if (v === '1') return true;
      if (v === '0') return false;
    } catch {
      /* ignore */
    }
    return defaultOpen;
  })();

  const [open, setOpen] = useState(initialOpen);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (action === 'HOLD') {
        try {
          localStorage.setItem(HOLD_COLLAPSE_KEY, next ? '1' : '0');
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  const colorMap = {
    BUY: 'success' as const,
    SELL: 'error' as const,
    HOLD: 'default' as const,
  };

  const bgColorMap = {
    BUY: varAlpha(theme.vars.palette.success.mainChannel, 0.06),
    SELL: varAlpha(theme.vars.palette.error.mainChannel, 0.06),
    HOLD: undefined,
  };

  return (
    <Card
      ref={(el: HTMLDivElement | null) => registerAnchor?.(action, el)}
      variant="outlined"
      sx={{ bgcolor: bgColorMap[action] }}
    >
      <Box
        onClick={handleToggle}
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Label color={colorMap[action]} variant="filled">
            {action}
          </Label>
          <Typography variant="subtitle2">
            {title}（{signals.length} 只）
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {action !== 'HOLD' && onCopyOrders ? (
            <Tooltip title="复制为 CSV：tsCode,股票名,操作,目标权重,建议手数">
              <Button
                size="small"
                color="inherit"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyOrders();
                }}
                startIcon={<Iconify icon="solar:copy-bold" width={16} />}
              >
                复制委托
              </Button>
            </Tooltip>
          ) : null}
          <Tooltip title="展开面板">
            <IconButton aria-label="展开面板" size="small">
              <Iconify icon={open ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Collapse in={open}>
        <SignalTable signals={signals} hasPortfolio={hasPortfolio} />
      </Collapse>
    </Card>
  );
}

// ----------------------------------------------------------------------

function SignalTable({
  signals,
  hasPortfolio,
}: {
  signals: TradingSignalItem[];
  hasPortfolio: boolean;
}) {
  return (
    <TableContainer>
      <Table size="small" sx={{ '& td, & th': { fontFeatureSettings: '"tnum"' } }}>
        <TableHead>
          <TableRow>
            <TableCell>股票代码</TableCell>
            <TableCell>股票名称</TableCell>
            <TableCell>标记</TableCell>
            <TableCell align="right">目标权重</TableCell>
            {hasPortfolio ? (
              <>
                <TableCell align="right">现权重</TableCell>
                <TableCell align="right">偏离</TableCell>
                <TableCell align="right">建议手数</TableCell>
              </>
            ) : null}
            <TableCell align="right">
              <Tooltip title="置信度由策略算法定义，仅在该策略内可比">
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                >
                  置信度
                  <Iconify icon="solar:info-circle-bold" width={12} />
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell align="right" sx={{ width: 36 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {signals.map((signal) => {
            const targetW = signal.targetWeight ?? null;
            const currentW = signal.currentWeight ?? null;
            const delta = targetW != null && currentW != null ? targetW - currentW : null;
            return (
              <TableRow
                key={signal.tsCode}
                hover
                sx={{
                  '& .row-action': { opacity: 0 },
                  '&:hover .row-action': { opacity: 1 },
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {signal.tsCode}
                  </Typography>
                </TableCell>
                <TableCell>{signal.stockName}</TableCell>
                <TableCell>
                  <SignalMarkChip signal={signal} />
                </TableCell>
                <TableCell align="right">
                  {targetW != null ? `${(targetW * 100).toFixed(1)}%` : '市价'}
                </TableCell>
                {hasPortfolio ? (
                  <>
                    <TableCell align="right">
                      {currentW != null ? `${(currentW * 100).toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color:
                          delta == null
                            ? 'text.secondary'
                            : delta > 0
                              ? 'success.main'
                              : delta < 0
                                ? 'error.main'
                                : 'text.secondary',
                        fontWeight: 600,
                      }}
                    >
                      {delta == null ? '—' : `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
                    </TableCell>
                    <TableCell align="right">
                      {signal.estimatedShares != null ? signal.estimatedShares : '—'}
                    </TableCell>
                  </>
                ) : null}
                <TableCell align="right">
                  <ConfidenceCell value={signal.confidence} />
                </TableCell>
                <TableCell align="right" sx={{ p: 0 }}>
                  <Tooltip title="跳转个股详情">
                    <IconButton
                      size="small"
                      className="row-action"
                      aria-label="跳转个股详情"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/stock/${signal.tsCode}`, '_blank');
                      }}
                      sx={{ transition: 'opacity 0.15s' }}
                    >
                      <Iconify icon="solar:arrow-right-bold" width={16} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ----------------------------------------------------------------------

function SignalMarkChip({ signal }: { signal: TradingSignalItem }) {
  const days = signal.consecutiveDays;
  const isNew = signal.isNew ?? days === 1;

  if (signal.action === 'SELL' && (signal.currentWeight ?? 0) > 0) {
    return (
      <Label color="warning" variant="soft">
        减仓
      </Label>
    );
  }
  if (isNew) {
    return (
      <Label color="info" variant="soft">
        新进
      </Label>
    );
  }
  if (days != null && days > 1) {
    return (
      <Label color="default" variant="soft">
        持有 {days} 天
      </Label>
    );
  }
  return (
    <Typography variant="caption" color="text.disabled">
      —
    </Typography>
  );
}

// ----------------------------------------------------------------------

function ConfidenceCell({ value }: { value: number | null }) {
  if (value == null) {
    return <Typography variant="body2">—</Typography>;
  }

  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? 'success' : value >= 0.5 ? 'warning' : 'error';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ width: 48, height: 6, borderRadius: 1 }}
      />
      <Typography variant="body2" sx={{ minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </Typography>
    </Box>
  );
}
