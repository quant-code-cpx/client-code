import type { CacheNamespaceMetrics } from 'src/api/tushare-sync';

import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type Props = {
  rows: CacheNamespaceMetrics[];
  loading: boolean;
};

export function CacheStatsTable({ rows, loading }: Props) {
  return (
    <Scrollbar>
      <TableContainer sx={{ overflow: 'unset' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>命名空间</TableCell>
              <TableCell align="right">键数</TableCell>
              <TableCell align="right">命中率</TableCell>
              <TableCell align="right">命中</TableCell>
              <TableCell align="right">未命中</TableCell>
              <TableCell align="right">写入</TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                失效
              </TableCell>
              <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>最后命中时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton width={j === 0 ? 140 : 60} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.namespace} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.namespace}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.keyCount.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color:
                            row.hitRate === null
                              ? 'text.disabled'
                              : row.hitRate >= 80
                                ? 'success.main'
                                : row.hitRate >= 50
                                  ? 'warning.main'
                                  : 'error.main',
                        }}
                      >
                        {row.hitRate !== null ? `${row.hitRate.toFixed(1)}%` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.hits.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.misses.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.writes.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ display: { xs: 'none', md: 'table-cell' } }}
                    >
                      <Typography variant="body2">{row.invalidations.toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {row.lastHitAt ? fDateTime(row.lastHitAt) : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    暂无缓存统计数据
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
