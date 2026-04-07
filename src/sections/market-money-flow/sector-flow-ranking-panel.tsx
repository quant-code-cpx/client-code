import type { SectorFlowRankingItem } from 'src/api/market';

import { useState, useEffect } from 'react';

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

import { SectorFlowTrendChart } from './sector-flow-trend-chart';

// ----------------------------------------------------------------------

type ContentType = 'INDUSTRY' | 'CONCEPT' | 'REGION';
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

function flowColor(value: number): 'error.main' | 'success.main' | 'text.secondary' {
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

/** 万元 → 亿元，保留 2 位小数 */
function toYiStr(wan: number): string {
  return `${(wan / 10000).toFixed(2)}亿`;
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
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
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
};

export function SectorFlowRankingPanel({ tradeDate }: Props) {
  const [contentTypeIndex, setContentTypeIndex] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('net_amount');
  const [sectors, setSectors] = useState<SectorFlowRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSector, setSelectedSector] = useState<SectorFlowRankingItem | null>(null);

  const contentType = CONTENT_TABS[contentTypeIndex]?.value ?? 'INDUSTRY';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSelectedSector(null);

    fetchSectorFlowRanking({
      trade_date: tradeDate,
      content_type: contentType,
      sort_by: sortBy,
      order: 'desc',
      limit: 30,
    })
      .then((res) => {
        if (!cancelled) setSectors(res?.sectors ?? []);
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
  }, [tradeDate, contentType, sortBy]);

  // Sort descending and ascending for top10 each
  const sorted = [...sectors].sort((a, b) => b.netAmount - a.netAmount);
  const top10Inflow = sorted.slice(0, 10);
  const top10Outflow = [...sectors].sort((a, b) => a.netAmount - b.netAmount).slice(0, 10);

  const handleRowClick = (item: SectorFlowRankingItem) => {
    setSelectedSector((prev) => (prev?.tsCode === item.tsCode ? null : item));
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
                  title="净流入 Top 10"
                  rows={top10Inflow}
                  selectedCode={selectedSector?.tsCode ?? null}
                  onRowClick={handleRowClick}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectorTable
                  title="净流出 Top 10"
                  rows={top10Outflow}
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
