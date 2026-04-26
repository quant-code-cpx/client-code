import type { MainFlowRankingItem, MainFlowRankingResponse } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fPctChg, fWanYuan } from 'src/utils/format-number';

import { fetchMainFlowRanking } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { MiniTierBar } from './mini-tier-bar';
import { StockFlowDetailDialog } from './stock-flow-detail-dialog';

// ----------------------------------------------------------------------

type SortBy = 'main_net_inflow' | 'elg_net_inflow' | 'lg_net_inflow' | 'pct_chg';
type FlowDir = 'inflow' | 'outflow' | 'dual';

const TOP_N_OPTIONS = [20, 50, 100] as const;

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'main_net_inflow', label: '主力净流入' },
  { value: 'elg_net_inflow', label: '超大单' },
  { value: 'lg_net_inflow', label: '大单' },
  { value: 'pct_chg', label: '涨跌幅' },
];

const DIR_OPTIONS: Array<{ value: FlowDir; label: string }> = [
  { value: 'inflow', label: '净流入' },
  { value: 'outflow', label: '净流出' },
  { value: 'dual', label: '双榜' },
];

function flowColor(value: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (value == null) return 'text.secondary';
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

// 本地排序辅助：对已有数据按维度排序
function sortRows(
  rows: MainFlowRankingItem[],
  sortBy: SortBy,
  order: 'asc' | 'desc'
): MainFlowRankingItem[] {
  const sorted = [...rows].sort((a, b) => {
    let va = 0;
    let vb = 0;
    if (sortBy === 'main_net_inflow') {
      va = a.mainNetInflow;
      vb = b.mainNetInflow;
    } else if (sortBy === 'elg_net_inflow') {
      va = a.elgNetInflow;
      vb = b.elgNetInflow;
    } else if (sortBy === 'lg_net_inflow') {
      va = a.lgNetInflow;
      vb = b.lgNetInflow;
    } else {
      va = a.pctChg ?? 0;
      vb = b.pctChg ?? 0;
    }
    return order === 'desc' ? vb - va : va - vb;
  });
  return sorted;
}

// CSV 导出
function downloadCsv(rows: MainFlowRankingItem[], title: string): void {
  const header = '代码,名称,行业,主力净流入(万),超大单净(万),大单净(万),涨跌幅(%)';
  const lines = rows.map((r) =>
    [
      r.tsCode,
      r.name ?? '',
      r.industry ?? '',
      r.mainNetInflow.toFixed(2),
      r.elgNetInflow.toFixed(2),
      r.lgNetInflow.toFixed(2),
      (r.pctChg ?? 0).toFixed(2),
    ].join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------------

type FlowTableProps = {
  title: string;
  rows: MainFlowRankingItem[];
  onRowClick: (item: MainFlowRankingItem) => void;
  selectedCode: string | null;
  compact?: boolean;
  localSortNote?: boolean;
};

function FlowTable({
  title,
  rows,
  onRowClick,
  selectedCode,
  compact,
  localSortNote,
}: FlowTableProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pb: '0 !important' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5, flexShrink: 0 }}
        >
          <Typography variant="h6">{title}</Typography>
          {localSortNote && (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              ※ 本地排序（前 100 名内）
            </Typography>
          )}
        </Stack>
        <Scrollbar sx={{ flex: 1, maxHeight: 520 }}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  {!compact && <TableCell>代码</TableCell>}
                  <TableCell>名称</TableCell>
                  {!compact && <TableCell>行业</TableCell>}
                  <TableCell align="right">主力净流入</TableCell>
                  <TableCell align="right">超大单</TableCell>
                  <TableCell align="right">大单</TableCell>
                  <TableCell align="right">涨跌幅</TableCell>
                  <TableCell align="right" sx={{ minWidth: 80 }}>
                    分层
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => {
                  const isSelected = row.tsCode === selectedCode;
                  return (
                    <TableRow
                      key={row.tsCode}
                      hover
                      selected={isSelected}
                      onClick={() => onRowClick(row)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {idx + 1}
                        </Typography>
                      </TableCell>
                      {!compact && (
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {row.tsCode}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2" fontWeight="fontWeightMedium">
                          {row.name}
                        </Typography>
                      </TableCell>
                      {!compact && (
                        <TableCell>
                          <Chip
                            label={row.industry ?? '-'}
                            size="small"
                            sx={{ height: 20, fontSize: 11, opacity: 0.75 }}
                          />
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="fontWeightMedium"
                          sx={{ color: flowColor(row.mainNetInflow) }}
                        >
                          {fWanYuan(row.mainNetInflow)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: flowColor(row.elgNetInflow) }}>
                          {fWanYuan(row.elgNetInflow)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: flowColor(row.lgNetInflow) }}>
                          {fWanYuan(row.lgNetInflow)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: flowColor(row.pctChg) }}>
                          {fPctChg(row.pctChg)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <MiniTierBar
                          elg={row.elgNetInflow}
                          lg={row.lgNetInflow}
                          md={row.mdNetInflow ?? 0}
                          sm={row.smNetInflow ?? 0}
                          unit="万"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={compact ? 7 : 9} align="center">
                      <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                        暂无数据
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MainFlowRankingTable({ tradeDate }: Props) {
  const [topN, setTopN] = useState<20 | 50 | 100>(20);
  const [sortBy, setSortBy] = useState<SortBy>('main_net_inflow');
  const [flowDir, setFlowDir] = useState<FlowDir>('dual');
  const [rawRes, setRawRes] = useState<MainFlowRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogStock, setDialogStock] = useState<MainFlowRankingItem | null>(null);

  // sortBy 变化时重新请求（后端支持 sort_by 后自动生效）
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setDialogStock(null);

    fetchMainFlowRanking({
      trade_date: tradeDate,
      sort_by: sortBy,
      dual: true,
      limit: 100,
    })
      .then((res) => {
        if (!cancelled) setRawRes(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载个股资金榜失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, sortBy]);

  // 类型守卫：后端已支持 dual 时直接用，否则 fallback 本地排序
  const isDualRes = rawRes != null && 'topInflow' in rawRes;
  const isLocalSort = !isDualRes;

  const inflowRows: MainFlowRankingItem[] = isDualRes
    ? (
        rawRes as { topInflow: MainFlowRankingItem[]; topOutflow: MainFlowRankingItem[] }
      ).topInflow.slice(0, topN)
    : sortRows(
        (rawRes as { data: MainFlowRankingItem[] } | null)?.data ?? [],
        sortBy,
        'desc'
      ).slice(0, topN);

  const outflowRows: MainFlowRankingItem[] = isDualRes
    ? (
        rawRes as { topInflow: MainFlowRankingItem[]; topOutflow: MainFlowRankingItem[] }
      ).topOutflow.slice(0, topN)
    : sortRows((rawRes as { data: MainFlowRankingItem[] } | null)?.data ?? [], sortBy, 'asc').slice(
        0,
        topN
      );

  const handleRowClick = (item: MainFlowRankingItem) => {
    setDialogStock(item);
  };

  const isDual = flowDir === 'dual';

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      {/* 工具栏 */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: '12px !important' } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                Top N
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={topN}
                size="small"
                onChange={(_, v) => {
                  if (v != null) setTopN(v);
                }}
              >
                {TOP_N_OPTIONS.map((n) => (
                  <ToggleButton key={n} value={n}>
                    {n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                排序
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={sortBy}
                size="small"
                onChange={(_, v) => {
                  if (v != null) setSortBy(v);
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <ToggleButton key={opt.value} value={opt.value}>
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                流向
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={flowDir}
                size="small"
                onChange={(_, v) => {
                  if (v != null) setFlowDir(v);
                }}
              >
                {DIR_OPTIONS.map((opt) => (
                  <ToggleButton key={opt.value} value={opt.value}>
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Box sx={{ flex: 1 }} />

            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="solar:download-bold" width={16} />}
              onClick={() => {
                if (flowDir === 'outflow') {
                  downloadCsv(outflowRows, `主力净流出Top${topN}`);
                } else {
                  downloadCsv(inflowRows, `主力净流入Top${topN}`);
                }
              }}
            >
              导出 CSV
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 表格区 */}
      {loading ? (
        <Skeleton variant="rectangular" height={400} />
      ) : isDual ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FlowTable
              title={`主力净流入 Top ${topN}`}
              rows={inflowRows}
              onRowClick={handleRowClick}
              selectedCode={dialogStock?.tsCode ?? null}
              compact
              localSortNote={isLocalSort}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FlowTable
              title={`主力净流出 Top ${topN}`}
              rows={outflowRows}
              onRowClick={handleRowClick}
              selectedCode={dialogStock?.tsCode ?? null}
              compact
              localSortNote={isLocalSort}
            />
          </Grid>
        </Grid>
      ) : (
        <FlowTable
          title={flowDir === 'inflow' ? `主力净流入 Top ${topN}` : `主力净流出 Top ${topN}`}
          rows={flowDir === 'inflow' ? inflowRows : outflowRows}
          onRowClick={handleRowClick}
          selectedCode={dialogStock?.tsCode ?? null}
          compact={false}
          localSortNote={isLocalSort}
        />
      )}

      {dialogStock != null && (
        <StockFlowDetailDialog
          open
          tsCode={dialogStock.tsCode}
          stockName={dialogStock.name ?? dialogStock.tsCode}
          onClose={() => setDialogStock(null)}
        />
      )}
    </>
  );
}
