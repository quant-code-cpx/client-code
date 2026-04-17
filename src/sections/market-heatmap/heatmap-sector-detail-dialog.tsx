import type { HeatmapItem } from 'src/api/heatmap';
import type { SectorFlowItem, MainFlowRankingItem } from 'src/api/market';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';

import { toYi, yuanToYi } from './utils';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  sector: SectorFlowItem | null;
  stocks: HeatmapItem[];
  stockFlows: MainFlowRankingItem[];
};

// ----------------------------------------------------------------------

export function HeatmapSectorDetailDialog({ open, onClose, sector, stocks, stockFlows }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState(0);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newVal: number) => {
    setTab(newVal);
  }, []);

  if (!sector) return null;

  const netYi = yuanToYi(sector.netAmount);
  const amountYi = toYi(sector.amount);

  const sortedStocks = [...stocks].sort((a, b) => (b.pctChg ?? 0) - (a.pctChg ?? 0)).slice(0, 30);
  const sortedFlows = [...stockFlows]
    .sort((a, b) => (b.mainNetInflow ?? 0) - (a.mainNetInflow ?? 0))
    .slice(0, 30);

  const pctColor = (v: number | null) => ((v ?? 0) >= 0 ? 'error.main' : 'success.main');
  const fmtPct = (v: number | null) => `${(v ?? 0) >= 0 ? '+' : ''}${(v ?? 0).toFixed(2)}%`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{sector.name} — 行业详情</DialogTitle>

      <DialogContent dividers>
        {/* 摘要卡片 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <StatCard
            label="涨跌幅"
            value={fmtPct(sector.pctChange)}
            color={pctColor(sector.pctChange)}
          />
          <StatCard
            label="净流入"
            value={`${netYi >= 0 ? '+' : ''}${netYi.toFixed(2)}亿`}
            color={netYi >= 0 ? 'error.main' : 'success.main'}
          />
          <StatCard label="成交额" value={`${amountYi.toFixed(1)}亿`} color="text.primary" />
          <StatCard
            label="涨/跌家数"
            value={`${sector.upCount ?? 0}↑ / ${sector.downCount ?? 0}↓`}
            color="text.primary"
          />
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="涨跌排名" />
          <Tab label="资金排名" />
        </Tabs>

        {tab === 0 && (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>股票名称</TableCell>
                  <TableCell>代码</TableCell>
                  <TableCell align="right">涨跌幅</TableCell>
                  <TableCell align="right">成交额(亿)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedStocks.map((s) => (
                  <TableRow key={s.tsCode}>
                    <TableCell>{s.name ?? s.tsCode}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{s.tsCode}</TableCell>
                    <TableCell align="right" sx={{ color: pctColor(s.pctChg), fontWeight: 600 }}>
                      {fmtPct(s.pctChg)}
                    </TableCell>
                    <TableCell align="right">{toYi((s.amount ?? 0) / 10)}</TableCell>
                  </TableRow>
                ))}
                {sortedStocks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: 'text.disabled' }}>
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>股票名称</TableCell>
                  <TableCell>代码</TableCell>
                  <TableCell align="right">主力净流入(万)</TableCell>
                  <TableCell align="right">涨跌幅</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFlows.map((s) => (
                  <TableRow key={s.tsCode}>
                    <TableCell>{s.name ?? s.tsCode}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{s.tsCode}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: (s.mainNetInflow ?? 0) >= 0 ? 'error.main' : 'success.main',
                        fontWeight: 600,
                      }}
                    >
                      {(s.mainNetInflow ?? 0).toFixed(0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: pctColor(s.pctChg), fontWeight: 600 }}>
                      {fmtPct(s.pctChg)}
                    </TableCell>
                  </TableRow>
                ))}
                {sortedFlows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: 'text.disabled' }}>
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          variant="outlined"
          onClick={() => {
            router.push('/industry-rotation');
            onClose();
          }}
        >
          查看行业轮动详情
        </Button>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        bgcolor: 'background.neutral',
        textAlign: 'center',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}
