import type { SectorFlowRankingItem } from 'src/api/market';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
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

import { fPctChg } from 'src/utils/format-number';

import { fetchSectorFlowRanking } from 'src/api/market';

import { MiniTierBar } from './mini-tier-bar';
import { SectorFlowTrendChart } from './sector-flow-trend-chart';

// ----------------------------------------------------------------------

export type ContentType = 'INDUSTRY' | 'CONCEPT' | 'REGION';
type SortBy = 'net_amount' | 'pct_change' | 'buy_elg_amount';

const CONTENT_TABS: Array<{ value: ContentType; label: string }> = [
  { value: 'INDUSTRY', label: '行业' },
  { value: 'CONCEPT', label: '概念' },
  { value: 'REGION', label: '地域' },
];

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'net_amount', label: '净流入' },
  { value: 'pct_change', label: '涨跌幅' },
  { value: 'buy_elg_amount', label: '超大单' },
];

/** 根据排序维度决定双榜标题 */
const SORT_TABLE_LABELS: Record<SortBy, { inflow: string; outflow: string }> = {
  net_amount: { inflow: '净流入', outflow: '净流出' },
  pct_change: { inflow: '涨幅', outflow: '跌幅' },
  buy_elg_amount: { inflow: '超大单流入', outflow: '超大单流出' },
};

const TOP_N_OPTIONS = [10, 20, 30] as const;
type TopN = (typeof TOP_N_OPTIONS)[number];

function flowColor(value: number): 'error.main' | 'success.main' | 'text.secondary' {
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

/** 元 → 亿元，保留 2 位小数 */
function toYiStr(yuan: number): string {
  return `${(yuan / 1e8).toFixed(2)}亿`;
}

// ----------------------------------------------------------------------

type SectorTableProps = {
  title: string;
  rows: SectorFlowRankingItem[];
  selectedCode: string | null;
  onRowClick: (item: SectorFlowRankingItem) => void;
};

function SectorTable({ title, rows, selectedCode, onRowClick }: SectorTableProps) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        {title}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>板块</TableCell>
              <TableCell align="right">涨跌幅</TableCell>
              <TableCell align="right">净流入</TableCell>
              <TableCell align="right">超大单</TableCell>
              <TableCell align="right" sx={{ minWidth: 96, pr: 1 }}>
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
                  role="button"
                  tabIndex={0}
                  aria-label={`${isSelected ? '取消选择' : '选择'}板块 ${row.name}`}
                  onClick={() => onRowClick(row)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onRowClick(row);
                  }}
                  sx={{
                    cursor: 'pointer',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {idx + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="fontWeightMedium">
                      {row.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: flowColor(row.pctChange) }}>
                      {fPctChg(row.pctChange)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: flowColor(row.netAmount) }}>
                      {toYiStr(row.netAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ color: flowColor(row.buyElgAmount) }}>
                      {toYiStr(row.buyElgAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <MiniTierBar
                        elg={row.buyElgAmount}
                        lg={row.buyLgAmount}
                        md={row.buyMdAmount}
                        sm={row.buySmAmount}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                    暂无数据
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
  /** 当前选中的“概念”板块；其他类型下以 null 冲出 */
  onConceptSelected?: (concept: { tsCode: string; name: string } | null) => void;
  /** A 区内部当前 content_type 向外同步，供父决定是否挂载 B 区 */
  onContentTypeChange?: (contentType: ContentType) => void;
};

export function SectorFlowRankingPanel({
  tradeDate,
  onConceptSelected,
  onContentTypeChange,
}: Props) {
  const [contentTypeIndex, setContentTypeIndex] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('net_amount');
  const [topN, setTopN] = useState<TopN>(10);
  const [inflowSectors, setInflowSectors] = useState<SectorFlowRankingItem[]>([]);
  const [outflowSectors, setOutflowSectors] = useState<SectorFlowRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSector, setSelectedSector] = useState<SectorFlowRankingItem | null>(null);

  const contentType = CONTENT_TABS[contentTypeIndex]?.value ?? 'INDUSTRY';

  // 使用 ref 持有最新回调，避免父组件未做 useCallback 时反复触发 effect
  const onConceptSelectedRef = useRef(onConceptSelected);
  const onContentTypeChangeRef = useRef(onContentTypeChange);
  useEffect(() => {
    onConceptSelectedRef.current = onConceptSelected;
  }, [onConceptSelected]);
  useEffect(() => {
    onContentTypeChangeRef.current = onContentTypeChange;
  }, [onContentTypeChange]);

  // 同步向外暴露 contentType
  useEffect(() => {
    onContentTypeChangeRef.current?.(contentType);
  }, [contentType]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSelectedSector(null);
    onConceptSelectedRef.current?.(null);

    fetchSectorFlowRanking({
      trade_date: tradeDate,
      content_type: contentType,
      sort_by: sortBy,
      dual: true,
      limit: topN,
    })
      .then((res) => {
        if (!cancelled && res != null && 'topInflow' in res) {
          setInflowSectors(res.topInflow);
          setOutflowSectors(res.topOutflow);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载板块资金排行失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, contentType, sortBy, topN]);

  const topInflow = inflowSectors;
  const topOutflow = outflowSectors;

  const handleRowClick = (item: SectorFlowRankingItem) => {
    setSelectedSector((prev) => {
      const next = prev?.tsCode === item.tsCode ? null : item;
      if (contentType === 'CONCEPT') {
        onConceptSelectedRef.current?.(next ? { tsCode: next.tsCode, name: next.name } : null);
      }
      return next;
    });
  };

  return (
    <>
      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">板块资金流向</Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <ToggleButtonGroup
                exclusive
                value={sortBy}
                size="small"
                onChange={(_, v) => {
                  if (v) setSortBy(v);
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <ToggleButton key={opt.value} value={opt.value}>
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <ToggleButtonGroup
                exclusive
                value={topN}
                size="small"
                onChange={(_, v: TopN | null) => {
                  if (v != null) setTopN(v);
                }}
              >
                {TOP_N_OPTIONS.map((n) => (
                  <ToggleButton key={n} value={n}>
                    Top{n}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          <Tabs value={contentTypeIndex} onChange={(_, v) => setContentTypeIndex(v)} sx={{ mb: 2 }}>
            {CONTENT_TABS.map((t) => (
              <Tab key={t.value} label={t.label} />
            ))}
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Skeleton variant="rectangular" height={400} />
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectorTable
                  title={`${SORT_TABLE_LABELS[sortBy].inflow} Top ${topN}`}
                  rows={topInflow}
                  selectedCode={selectedSector?.tsCode ?? null}
                  onRowClick={handleRowClick}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectorTable
                  title={`${SORT_TABLE_LABELS[sortBy].outflow} Top ${topN}`}
                  rows={topOutflow}
                  selectedCode={selectedSector?.tsCode ?? null}
                  onRowClick={handleRowClick}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {selectedSector != null && (
        <SectorFlowTrendChart
          tsCode={selectedSector.tsCode}
          sectorName={selectedSector.name}
          contentType={contentType}
          days={20}
          open
        />
      )}
    </>
  );
}
