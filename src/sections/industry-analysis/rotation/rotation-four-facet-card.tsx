import type { FlowAnalysisItem, MomentumRankingItem, SectorValuationItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { periodToDays } from 'src/utils/format-time';

import {
  fetchFlowAnalysis,
  fetchMomentumRanking,
  fetchSectorValuation,
  fetchReturnComparison,
} from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
  period?: string;
  onSectorClick?: (name: string) => void;
  refreshKey?: number;
};

// ----------------------------------------------------------------------

export function RotationFourFacetCard({ tradeDate, period, onSectorClick, refreshKey }: Props) {
  const [momentum, setMomentum] = useState<MomentumRankingItem[]>([]);
  const [returns, setReturns] = useState<Array<{ name: string; cumReturn: number }>>([]);
  const [flows, setFlows] = useState<FlowAnalysisItem[]>([]);
  const [valuation, setValuation] = useState<SectorValuationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchMomentumRanking({ trade_date: tradeDate, limit: 0 }),
      fetchReturnComparison({ trade_date: tradeDate }),
      fetchFlowAnalysis({
        trade_date: tradeDate,
        days: period ? Math.min(periodToDays(period), 60) : undefined,
      }),
      fetchSectorValuation({ trade_date: tradeDate }),
    ])
      .then(([momRes, retRes, flowRes, valRes]) => {
        if (cancelled) return;
        setMomentum(momRes?.rankings ?? []);
        // Extract the first period's return for each sector
        const sectors = retRes?.sectors ?? [];
        setReturns(
          sectors.map((s) => ({
            name: s.name,
            cumReturn: s.data.length > 0 ? s.data[s.data.length - 1].cumReturn : 0,
          }))
        );
        setFlows(flowRes?.flows ?? []);
        setValuation(valRes?.sectors ?? []);
      })
      .catch(() => {
        // Silent fail — each column shows empty state
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, period, refreshKey]);

  const pctColor = (v: number) => (v >= 0 ? 'error.main' : 'success.main');
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

  const topMomentum = [...momentum].sort((a, b) => b.momentum - a.momentum).slice(0, 10);
  const topReturns = [...returns].sort((a, b) => b.cumReturn - a.cumReturn).slice(0, 10);
  const topFlows = [...flows].sort((a, b) => b.netInflow - a.netInflow).slice(0, 10);
  const topValuation = [...valuation].sort((a, b) => a.pePercentile - b.pePercentile).slice(0, 10);

  if (loading) {
    return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />;
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid`,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Grid container>
        {/* Momentum */}
        <FacetColumn
          title="动量 Top 10"
          tooltip="动量评分 = 多周期收益率加权排名，值越高代表近期趋势越强"
        >
          <MiniTable>
            {topMomentum.map((item) => (
              <MiniRow
                key={item.name}
                name={item.name}
                value={item.momentum.toFixed(2)}
                color="text.primary"
                onClick={onSectorClick ? () => onSectorClick(item.name) : undefined}
              />
            ))}
          </MiniTable>
        </FacetColumn>

        {/* Returns */}
        <FacetColumn title="收益 Top 10" tooltip="选定周期内的累计收益率">
          <MiniTable>
            {topReturns.map((item) => (
              <MiniRow
                key={item.name}
                name={item.name}
                value={fmtPct(item.cumReturn)}
                color={pctColor(item.cumReturn)}
                onClick={onSectorClick ? () => onSectorClick(item.name) : undefined}
              />
            ))}
          </MiniTable>
        </FacetColumn>

        {/* Flow */}
        <FacetColumn title="资金 Top 10" tooltip="选定周期内的累计净流入金额（亿元）">
          <MiniTable>
            {topFlows.map((item) => (
              <MiniRow
                key={item.name}
                name={item.name}
                value={`${(item.netInflow / 100000000).toFixed(2)}亿`}
                color={item.netInflow >= 0 ? 'error.main' : 'success.main'}
                onClick={onSectorClick ? () => onSectorClick(item.name) : undefined}
              />
            ))}
          </MiniTable>
        </FacetColumn>

        {/* Valuation */}
        <FacetColumn title="估值低位 Top 10" tooltip="PE TTM 分位数越低代表估值越便宜（1 年窗口）">
          <MiniTable>
            {topValuation.map((item) => (
              <MiniRow
                key={item.name}
                name={item.name}
                value={`${item.pePercentile.toFixed(1)}%`}
                color={
                  item.pePercentile <= 30
                    ? 'success.main'
                    : item.pePercentile <= 70
                      ? 'warning.main'
                      : 'error.main'
                }
                onClick={onSectorClick ? () => onSectorClick(item.name) : undefined}
              />
            ))}
          </MiniTable>
        </FacetColumn>
      </Grid>
    </Box>
  );
}

// ── Internal mini components ────────────────────────────────────

function FacetColumn({
  title,
  tooltip,
  children,
}: {
  title: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Box
        sx={{ height: '100%', borderRight: { md: `1px solid` }, borderColor: { md: 'divider' } }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1, px: 1, pt: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Tooltip title={<Typography variant="caption">{tooltip}</Typography>} arrow>
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              <Iconify icon="solar:question-circle-bold" width={14} />
            </IconButton>
          </Tooltip>
        </Stack>
        {children}
      </Box>
    </Grid>
  );
}

function MiniTable({ children }: { children: React.ReactNode }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ py: 0.5, px: 1, fontSize: 12, borderBottomColor: 'divider' }}>
              行业
            </TableCell>
            <TableCell
              align="right"
              sx={{ py: 0.5, px: 1, fontSize: 12, borderBottomColor: 'divider' }}
            >
              数值
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{children}</TableBody>
      </Table>
    </TableContainer>
  );
}

function MiniRow({
  name,
  value,
  color,
  onClick,
}: {
  name: string;
  value: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <TableRow
      hover={!!onClick}
      sx={{ cursor: onClick ? 'pointer' : 'default', height: 32 }}
      onClick={onClick}
    >
      <TableCell
        sx={{
          py: 0.25,
          px: 1,
          fontSize: 12,
          maxWidth: 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <Tooltip title={name} arrow placement="top">
          <span>{name}</span>
        </Tooltip>
      </TableCell>
      <TableCell
        align="right"
        sx={{
          py: 0.25,
          px: 1,
          fontSize: 12,
          color,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </TableCell>
    </TableRow>
  );
}
