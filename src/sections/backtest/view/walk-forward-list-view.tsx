import type { WalkForwardRunSummary, WalkForwardRunListResponse } from 'src/api/backtest';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TablePagination from '@mui/material/TablePagination';

import { useRouter } from 'src/routes/hooks';

import { listWalkForwardRuns } from 'src/api/backtest';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { WalkForwardListTable } from '../walk-forward-list-table';

// ----------------------------------------------------------------------

export function WalkForwardListView() {
  const router = useRouter();

  const [rows, setRows] = useState<WalkForwardRunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const fetchRuns = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res: WalkForwardRunListResponse = await listWalkForwardRuns({
          page: p + 1,
          pageSize,
        });
        setRows(res.items ?? []);
        setTotal(res.total ?? 0);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  // Auto-load on mount
  useEffect(() => {
    fetchRuns(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    fetchRuns(newPage);
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">Walk-Forward 验证</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            通过滚动训练-测试窗口检验策略的样本外可重复性
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" width={20} />}
          onClick={() => router.push('/backtest/walk-forward/create')}
        >
          新建 WF 任务
        </Button>
      </Box>

      <Card>
        <WalkForwardListTable rows={rows} loading={loading} />
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[20]}
          onPageChange={handlePageChange}
        />
      </Card>
    </DashboardContent>
  );
}
