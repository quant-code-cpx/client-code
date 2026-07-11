import type { StockFlowDetailItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';

import { fmtTradeDate as fmtDate } from 'src/utils/format-time';

import { fetchStockFlowDetail } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

function fmtWan(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${(v / 10000).toFixed(2)}亿`;
  return `${v.toFixed(2)}万`;
}

/** 单格：数值 + 独立比例背景条 */
type NetCellProps = { value: number; maxAbs: number; posColor: string; negColor: string };

function NetCell({ value, maxAbs, posColor, negColor }: NetCellProps) {
  const pct = maxAbs > 0 ? (Math.abs(value) / maxAbs) * 100 : 0;
  const isPos = value > 0;
  const textColor = value > 0 ? posColor : value < 0 ? negColor : 'text.secondary';
  return (
    <TableCell align="right" sx={{ position: 'relative', py: 0.75 }}>
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          bottom: '20%',
          right: 4,
          width: `calc(${pct}% - 4px)`,
          maxWidth: 'calc(100% - 8px)',
          bgcolor: isPos ? `${posColor}26` : `${negColor}26`,
          borderRadius: '2px 0 0 2px',
        }}
      />
      <Typography
        variant="caption"
        sx={{
          position: 'relative',
          color: textColor,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value >= 0 ? '+' : ''}
        {fmtWan(value)}
      </Typography>
    </TableCell>
  );
}

// ----------------------------------------------------------------------

type LatestTierRow = {
  label: string;
  buy: number;
  sell: number;
  net: number;
};

type Props = {
  open: boolean;
  tsCode: string;
  stockName: string;
  onClose: () => void;
};

export function StockFlowDetailDialog({ open, tsCode, stockName, onClose }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const [data, setData] = useState<StockFlowDetailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !tsCode) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchStockFlowDetail({ ts_code: tsCode, days: 20 })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载个股资金明细失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, tsCode]);

  const handleGoDetail = () => {
    onClose();
    router.push(`/stock/detail?code=${encodeURIComponent(tsCode)}`);
  };

  // 四档每日净流入（新→旧倒序显示）
  const tableRows = [...data].reverse();

  // 各档独立最大绝对值，用于比例条宽度计算
  const maxElgAbs = Math.max(...data.map((d) => Math.abs(d.buyElgAmount - d.sellElgAmount)), 1);
  const maxLgAbs = Math.max(...data.map((d) => Math.abs(d.buyLgAmount - d.sellLgAmount)), 1);
  const maxMdAbs = Math.max(...data.map((d) => Math.abs(d.buyMdAmount - d.sellMdAmount)), 1);
  const maxSmAbs = Math.max(...data.map((d) => Math.abs(d.buySmAmount - d.sellSmAmount)), 1);
  const maxTotalAbs = Math.max(...data.map((d) => Math.abs(d.netMfAmount)), 1);

  const posColor = theme.palette.error.main;
  const negColor = theme.palette.success.main;

  // 最新一天的四档买卖明细
  const latest = data[data.length - 1];
  const latestRows: LatestTierRow[] = latest
    ? [
        {
          label: '超大单',
          buy: latest.buyElgAmount,
          sell: latest.sellElgAmount,
          net: latest.buyElgAmount - latest.sellElgAmount,
        },
        {
          label: '大单',
          buy: latest.buyLgAmount,
          sell: latest.sellLgAmount,
          net: latest.buyLgAmount - latest.sellLgAmount,
        },
        {
          label: '中单',
          buy: latest.buyMdAmount,
          sell: latest.sellMdAmount,
          net: latest.buyMdAmount - latest.sellMdAmount,
        },
        {
          label: '小单',
          buy: latest.buySmAmount,
          sell: latest.sellSmAmount,
          net: latest.buySmAmount - latest.sellSmAmount,
        },
      ]
    : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" component="span">
              {stockName}
            </Typography>
            <Typography variant="body2" component="span" sx={{ color: 'text.secondary', ml: 1 }}>
              {tsCode}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              endIcon={<Iconify icon="solar:arrow-right-bold" width={14} />}
              onClick={handleGoDetail}
            >
              个股详情
            </Button>
            <Tooltip title="关闭">
              <IconButton onClick={onClose} size="small" aria-label="关闭">
                <Iconify icon="solar:close-circle-bold" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            <Skeleton variant="rectangular" height={260} sx={{ mb: 2, borderRadius: 1 }} />
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
          </>
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 240,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <>
            {/* 四档净流入逐日明细表（各档独立比例，避免大量日压扁其他日期） */}
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', fontWeight: 600, mb: 0.5, display: 'block' }}
            >
              近 {data.length} 日四档净流入明细（各档独立比例）
            </Typography>
            <Scrollbar sx={{ maxHeight: 300 }}>
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 72, whiteSpace: 'nowrap' }}>日期</TableCell>
                      <TableCell align="right" sx={{ minWidth: 90 }}>
                        超大单净
                      </TableCell>
                      <TableCell align="right" sx={{ minWidth: 90 }}>
                        大单净
                      </TableCell>
                      <TableCell align="right" sx={{ minWidth: 90 }}>
                        中单净
                      </TableCell>
                      <TableCell align="right" sx={{ minWidth: 90 }}>
                        小单净
                      </TableCell>
                      <TableCell align="right" sx={{ minWidth: 90 }}>
                        总净流入
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((row) => (
                      <TableRow key={row.tradeDate} hover>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                          >
                            {fmtDate(row.tradeDate)}
                          </Typography>
                        </TableCell>
                        <NetCell
                          value={row.buyElgAmount - row.sellElgAmount}
                          maxAbs={maxElgAbs}
                          posColor={posColor}
                          negColor={negColor}
                        />
                        <NetCell
                          value={row.buyLgAmount - row.sellLgAmount}
                          maxAbs={maxLgAbs}
                          posColor={posColor}
                          negColor={negColor}
                        />
                        <NetCell
                          value={row.buyMdAmount - row.sellMdAmount}
                          maxAbs={maxMdAbs}
                          posColor={posColor}
                          negColor={negColor}
                        />
                        <NetCell
                          value={row.buySmAmount - row.sellSmAmount}
                          maxAbs={maxSmAbs}
                          posColor={posColor}
                          negColor={negColor}
                        />
                        <NetCell
                          value={row.netMfAmount}
                          maxAbs={maxTotalAbs}
                          posColor={posColor}
                          negColor={negColor}
                        />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Scrollbar>

            <Divider sx={{ my: 2 }} />

            {/* 最新一日买卖明细 */}
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', fontWeight: 600, mb: 1.5, display: 'block' }}
            >
              最新交易日（{latest ? fmtDate(latest.tradeDate) : '-'}）买卖明细
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1.5,
              }}
            >
              {latestRows.map((row) => (
                <Box
                  key={row.label}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.neutral',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}
                  >
                    {row.label}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        买入
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                        {fmtWan(row.buy)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        卖出
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                        {fmtWan(row.sell)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 0.25 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        净流入
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color:
                            row.net > 0
                              ? theme.palette.error.main
                              : row.net < 0
                                ? theme.palette.success.main
                                : theme.palette.text.secondary,
                        }}
                      >
                        {row.net >= 0 ? '+' : ''}
                        {fmtWan(row.net)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
