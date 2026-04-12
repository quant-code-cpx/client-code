import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { listReports, deleteReport, type ReportType, type ReportListItem } from 'src/api/report';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ReportGenerateDialog } from '../report-generate-dialog';
import {
  formatFileSize,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_COLORS,
  REPORT_STATUS_CONFIG,
} from '../constants';

// ── Component ─────────────────────────────────────────────────

export function ReportListView() {
  const router = useRouter();

  const [filterType, setFilterType] = useState<ReportType | ''>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listReports({
        type: filterType || undefined,
        page: page + 1,
        pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterType, page, pageSize]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleFilterTypeChange = (value: ReportType | '') => {
    setFilterType(value);
    setPage(0);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      await deleteReport({ reportId: deleteConfirmId });
      setDeleteConfirmId(null);
      fetchList();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">量化报告</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={() => setGenerateDialogOpen(true)}
        >
          生成报告
        </Button>
      </Box>

      {/* 筛选栏 */}
      <Box sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="报告类型"
          value={filterType}
          onChange={(e) => handleFilterTypeChange(e.target.value as ReportType | '')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">全部</MenuItem>
          <MenuItem value="BACKTEST">回测报告</MenuItem>
          <MenuItem value="STOCK">个股研报</MenuItem>
          <MenuItem value="PORTFOLIO">组合报告</MenuItem>
          <MenuItem value="STRATEGY_RESEARCH">策略研究</MenuItem>
        </TextField>
      </Box>

      {/* 报告列表 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>标题</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>格式</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>文件大小</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell>完成时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    加载中…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    暂无报告，点击&ldquo;生成报告&rdquo;开始
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const statusCfg = REPORT_STATUS_CONFIG[row.status];
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => router.push(`/research/report/${row.id}`)}
                        >
                          {row.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Label color={REPORT_TYPE_COLORS[row.type] as any}>
                          {REPORT_TYPE_LABELS[row.type]}
                        </Label>
                      </TableCell>
                      <TableCell>{row.format}</TableCell>
                      <TableCell>
                        <Label color={statusCfg.color as any}>{statusCfg.label}</Label>
                      </TableCell>
                      <TableCell>{formatFileSize(row.fileSize)}</TableCell>
                      <TableCell>{fDateTime(row.createdAt)}</TableCell>
                      <TableCell>{row.completedAt ? fDateTime(row.completedAt) : '-'}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => router.push(`/research/report/${row.id}`)}
                          >
                            查看
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => setDeleteConfirmId(row.id)}
                          >
                            删除
                          </Button>
                        </Box>
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
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页"
        />
      </Card>

      {/* 生成报告弹窗 */}
      <ReportGenerateDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        onGenerated={() => {
          setGenerateDialogOpen(false);
          fetchList();
        }}
      />

      {/* 删除确认弹窗 */}
      {deleteConfirmId && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <Card sx={{ p: 3, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              确认删除
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              删除后无法恢复，确定要删除此报告吗？
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setDeleteConfirmId(null)}>
                取消
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={deleteLoading}
                onClick={handleDelete}
              >
                {deleteLoading ? '删除中…' : '删除'}
              </Button>
            </Box>
          </Card>
        </Box>
      )}
    </DashboardContent>
  );
}
