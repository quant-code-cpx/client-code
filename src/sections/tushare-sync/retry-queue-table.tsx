import type { RetryQueueItem } from 'src/api/tushare-sync';

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

const RETRY_STATUS_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  RETRYING: 'info',
  SUCCEEDED: 'success',
  EXHAUSTED: 'error',
};

const RETRY_STATUS_LABEL: Record<string, string> = {
  PENDING: '等待重试',
  RETRYING: '重试中',
  SUCCEEDED: '已成功',
  EXHAUSTED: '已耗尽',
};

type Props = {
  rows: RetryQueueItem[];
  loading: boolean;
};

export function RetryQueueTable({ rows, loading }: Props) {
  return (
    <Scrollbar>
      <TableContainer sx={{ overflow: 'unset' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>任务</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>分片键</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>错误消息</TableCell>
              <TableCell align="center">重试次数</TableCell>
              <TableCell align="center">最大重试</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>下次重试</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton width={100} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Skeleton width={80} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Skeleton width={200} />
                    </TableCell>
                    <TableCell align="center">
                      <Skeleton width={40} sx={{ mx: 'auto' }} />
                    </TableCell>
                    <TableCell align="center">
                      <Skeleton width={40} sx={{ mx: 'auto' }} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Skeleton width={130} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={70} height={22} />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.task}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {row.failedKey ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.errorMessage}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{row.retryCount}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{row.maxRetries}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {row.status === 'EXHAUSTED' || row.status === 'SUCCEEDED'
                          ? '—'
                          : fDateTime(row.nextRetryAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Label
                        color={RETRY_STATUS_COLOR[row.status] ?? 'default'}
                        variant="soft"
                      >
                        {RETRY_STATUS_LABEL[row.status] ?? row.status}
                      </Label>
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    重试队列为空，所有同步任务运行正常 ✅
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
