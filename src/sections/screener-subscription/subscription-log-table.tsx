import type { SubscriptionLog } from 'src/api/screener-subscription';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { fDate, fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type SubscriptionLogTableProps = {
  logs: SubscriptionLog[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

export function SubscriptionLogTable({
  logs,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
}: SubscriptionLogTableProps) {
  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>日期</TableCell>
              <TableCell align="right">匹配数</TableCell>
              <TableCell align="right">新增</TableCell>
              <TableCell align="right">退出</TableCell>
              <TableCell align="right">耗时</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                   
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                       
                      <TableCell key={j}>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="caption">
                        {fDate(log.tradeDate, 'YYYY-MM-DD')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                        {fDateTime(log.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{log.matchCount}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      {log.newEntryCount}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      {log.exitCount}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">{log.executionMs} ms</Typography>
                    </TableCell>
                    <TableCell>
                      {log.success ? (
                        <Label color="success" variant="soft">
                          成功
                        </Label>
                      ) : (
                        <Box>
                          <Label color="error" variant="soft">
                            失败
                          </Label>
                          {log.errorMessage && (
                            <Typography
                              variant="caption"
                              sx={{ color: 'error.main', display: 'block', mt: 0.25 }}
                            >
                              {log.errorMessage}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

            {!loading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    暂无执行记录
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[10, 20, 50]}
        onPageChange={(_, p) => onPageChange(p + 1)}
        onRowsPerPageChange={() => {}}
        labelRowsPerPage="每页"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
      />
    </Box>
  );
}
