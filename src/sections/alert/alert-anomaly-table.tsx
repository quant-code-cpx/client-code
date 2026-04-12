import type { AnomalyType, MarketAnomaly } from 'src/api/alert';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { AlertAnomalyDetailPopover } from './alert-anomaly-detail-popover';

// ----------------------------------------------------------------------

type AnomalyMeta = {
  text: string;
  color: 'warning' | 'error' | 'info';
  unit: string;
};

const ANOMALY_TYPE_LABEL: Record<AnomalyType, AnomalyMeta> = {
  VOLUME_SURGE: { text: '放量突破', color: 'warning', unit: 'x' },
  CONSECUTIVE_LIMIT_UP: { text: '连续涨停', color: 'error', unit: '天' },
  LARGE_NET_INFLOW: { text: '大额净流入', color: 'info', unit: '%' },
};

function formatValue(type: AnomalyType, value: number): string {
  switch (type) {
    case 'VOLUME_SURGE':
      return `${value.toFixed(1)}x`;
    case 'CONSECUTIVE_LIMIT_UP':
      return `${value}天`;
    case 'LARGE_NET_INFLOW':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return String(value);
  }
}

function formatThreshold(type: AnomalyType, threshold: number): string {
  switch (type) {
    case 'VOLUME_SURGE':
      return `${threshold.toFixed(1)}x`;
    case 'CONSECUTIVE_LIMIT_UP':
      return `${threshold}天`;
    case 'LARGE_NET_INFLOW':
      return `${(threshold * 100).toFixed(1)}%`;
    default:
      return String(threshold);
  }
}

// ----------------------------------------------------------------------

type Props = {
  items: MarketAnomaly[];
  loading: boolean;
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function AlertAnomalyTable({ items, loading, page, total, pageSize, onPageChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<MarketAnomaly | null>(null);

  const handleOpenDetail = (el: HTMLElement, anomaly: MarketAnomaly) => {
    setAnchorEl(el);
    setSelectedAnomaly(anomaly);
  };

  const handleCloseDetail = () => {
    setAnchorEl(null);
    setSelectedAnomaly(null);
  };

  if (loading) {
    return <Skeleton variant="rounded" height={300} />;
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>代码</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>异动类型</TableCell>
              <TableCell align="right">检测值</TableCell>
              <TableCell align="right">阈值</TableCell>
              <TableCell>交易日</TableCell>
              <TableCell>扫描时间</TableCell>
              <TableCell align="center">详情</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无异动数据
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const meta = ANOMALY_TYPE_LABEL[item.anomalyType];
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box
                        component={RouterLink}
                        href={`/stock/${item.tsCode}`}
                        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {item.tsCode}
                      </Box>
                    </TableCell>
                    <TableCell>{item.stockName}</TableCell>
                    <TableCell>
                      <Label color={meta.color} variant="soft">
                        {meta.text}
                      </Label>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={`${meta.color}.main`} fontWeight={600}>
                        {formatValue(item.anomalyType, item.value)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatThreshold(item.anomalyType, item.threshold)}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.tradeDate}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {new Date(item.scannedAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<Iconify icon="solar:eye-bold" width={14} />}
                        onClick={(e) => handleOpenDetail(e.currentTarget, item)}
                      >
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[pageSize]}
        onPageChange={(_e, newPage) => onPageChange(newPage)}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / 共 ${count} 条`}
      />

      <AlertAnomalyDetailPopover
        anchorEl={anchorEl}
        anomaly={selectedAnomaly}
        onClose={handleCloseDetail}
      />
    </>
  );
}
