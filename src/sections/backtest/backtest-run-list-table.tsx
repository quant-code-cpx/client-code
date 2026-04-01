import type { BacktestRunListItem } from 'src/api/backtest';

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

import { fDateTime } from 'src/utils/format-time';
import { fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { STATUS_COLOR, STATUS_LABEL, STRATEGY_TYPE_LABEL } from './constants';

// ----------------------------------------------------------------------

interface BacktestRunListTableProps {
  items: BacktestRunListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (runId: string) => void;
  onCopy: (item: BacktestRunListItem) => void;
}

function pctCell(value: number | null, invert?: boolean) {
  if (value == null) return <Typography variant="body2" sx={{ color: 'text.disabled' }}>-</Typography>;
  const color = invert
    ? value < 0 ? 'success.main' : 'error.main'
    : value >= 0 ? 'error.main' : 'success.main';
  return (
    <Typography variant="body2" sx={{ color }}>
      {value >= 0 ? '+' : ''}{fPercent(value)}
    </Typography>
  );
}

export function BacktestRunListTable({
  items,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
  onView,
  onCopy,
}: BacktestRunListTableProps) {
  return (
    <Box>
      <Scrollbar>
        <TableContainer sx={{ overflow: 'unset' }}>
          <Table sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell>任务名称</TableCell>
                <TableCell>策略类型</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>回测区间</TableCell>
                <TableCell>基准</TableCell>
                <TableCell align="right">总收益</TableCell>
                <TableCell align="right">最大回撤</TableCell>
                <TableCell align="right">夏普</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton width={j === 9 ? 80 : '80%'} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : items.map((item) => (
                    <TableRow key={item.runId} hover={true}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.name ?? '未命名'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {item.runId.slice(0, 8)}…
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {STRATEGY_TYPE_LABEL[item.strategyType] ?? item.strategyType}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Label
                          color={STATUS_COLOR[item.status] ?? 'default'}
                          variant="soft"
                        >
                          {STATUS_LABEL[item.status] ?? item.status}
                        </Label>
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption">
                          {item.startDate} ~<br />{item.endDate}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption">{item.benchmarkTsCode}</Typography>
                      </TableCell>

                      <TableCell align="right">{pctCell(item.totalReturn)}</TableCell>
                      <TableCell align="right">{pctCell(item.maxDrawdown, true)}</TableCell>

                      <TableCell align="right">
                        {item.sharpeRatio != null ? (
                          <Typography variant="body2">{item.sharpeRatio.toFixed(2)}</Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>-</Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption">
                          {fDateTime(item.createdAt, 'YYYY-MM-DD HH:mm')}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onView(item.runId)}
                            startIcon={<Iconify icon="solar:eye-bold" width={14} />}
                          >
                            查看
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => onCopy(item)}
                            startIcon={<Iconify icon="solar:copy-bold" width={14} />}
                          >
                            复制
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}

              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      暂无回测记录
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="每页"
      />
    </Box>
  );
}
