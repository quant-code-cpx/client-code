import type { SyncLogSummaryItem } from 'src/api/tushare-sync';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const SYNC_STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  SKIPPED: 'warning',
};

const SYNC_STATUS_LABEL: Record<string, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
  SKIPPED: '跳过',
};

type Props = {
  rows: SyncLogSummaryItem[];
  loading: boolean;
};

export function SyncLogSummaryTable({ rows, loading }: Props) {
  return (
    <Scrollbar>
      <TableContainer sx={{ overflow: 'unset' }}>
        <Table sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>任务</TableCell>
              <TableCell>最后同步时间</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">行数</TableCell>
              <TableCell align="right">连续失败</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton width={120} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={140} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={60} height={22} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton width={60} sx={{ ml: 'auto' }} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton width={40} sx={{ ml: 'auto' }} />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.task} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.task}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {row.lastSyncAt ? fDateTime(row.lastSyncAt) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.lastStatus ? (
                        <Label
                          color={SYNC_STATUS_COLOR[row.lastStatus] ?? 'default'}
                          variant="soft"
                        >
                          {SYNC_STATUS_LABEL[row.lastStatus] ?? row.lastStatus}
                        </Label>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {row.lastRowCount !== null ? row.lastRowCount.toLocaleString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {row.consecutiveFailures > 0 ? (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 0.5,
                          }}
                        >
                          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                            {row.consecutiveFailures}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          0
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    暂无同步状态记录
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );
}
