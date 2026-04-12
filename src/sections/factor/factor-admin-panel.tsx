import type { PrecomputeStatusItem } from 'src/api/factor';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { adminBackfill, adminPrecompute, adminPrecomputeStatus } from 'src/api/factor';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export function FactorAdminPanel() {
  const [statusItems, setStatusItems] = useState<PrecomputeStatusItem[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  const [precomputeMsg, setPrecomputeMsg] = useState('');
  const [precomputeLoading, setPrecomputeLoading] = useState(false);

  const [backfillNames, setBackfillNames] = useState('');
  const [backfillStart, setBackfillStart] = useState('');
  const [backfillEnd, setBackfillEnd] = useState('');
  const [backfillMsg, setBackfillMsg] = useState('');
  const [backfillLoading, setBackfillLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const res = await adminPrecomputeStatus();
      setStatusItems(res.items);
    } catch {
      setStatusError('获取预计算状态失败');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handlePrecompute = async () => {
    setPrecomputeLoading(true);
    setPrecomputeMsg('');
    try {
      const res = await adminPrecompute({});
      setPrecomputeMsg(`任务已提交：${res.message}（Job ID: ${res.jobId}）`);
      fetchStatus();
    } catch {
      setPrecomputeMsg('触发预计算失败');
    } finally {
      setPrecomputeLoading(false);
    }
  };

  const handleBackfill = async () => {
    if (!backfillNames.trim() || !backfillStart || !backfillEnd) return;
    setBackfillLoading(true);
    setBackfillMsg('');
    try {
      const names = backfillNames.split(/[\n,;，；\s]+/).map((s) => s.trim()).filter(Boolean);
      const res = await adminBackfill({
        factorNames: names,
        startDate: backfillStart.replace(/-/g, ''),
        endDate: backfillEnd.replace(/-/g, ''),
      });
      setBackfillMsg(`回补任务已提交：${res.message}（Job ID: ${res.jobId}）`);
      fetchStatus();
    } catch {
      setBackfillMsg('触发回补失败');
    } finally {
      setBackfillLoading(false);
    }
  };

  return (
    <Box>
      {/* 预计算状态表 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              因子预计算状态
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" onClick={fetchStatus} disabled={statusLoading}>
                刷新
              </Button>
              <Button size="small" variant="contained" onClick={handlePrecompute} disabled={precomputeLoading}>
                {precomputeLoading ? '提交中...' : '全量预计算'}
              </Button>
            </Box>
          </Box>

          {precomputeMsg && (
            <Alert severity={precomputeMsg.includes('失败') ? 'error' : 'success'} sx={{ mb: 2 }}>
              {precomputeMsg}
            </Alert>
          )}

          {statusLoading && <Skeleton variant="rectangular" height={200} />}
          {statusError && <Alert severity="error">{statusError}</Alert>}

          {!statusLoading && statusItems.length > 0 && (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>因子标识</TableCell>
                    <TableCell>中文名</TableCell>
                    <TableCell>最后计算日期</TableCell>
                    <TableCell align="right">行数</TableCell>
                    <TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statusItems.map((item) => (
                    <TableRow key={item.factorName} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {item.factorName}
                      </TableCell>
                      <TableCell>{item.factorLabel}</TableCell>
                      <TableCell>{item.lastComputeDate ?? '--'}</TableCell>
                      <TableCell align="right">{item.rowCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Label
                          color={
                            item.status === 'UP_TO_DATE'
                              ? 'success'
                              : item.status === 'STALE'
                                ? 'warning'
                                : 'error'
                          }
                          variant="soft"
                        >
                          {item.status}
                        </Label>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 历史回补 */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            历史因子值回补
          </Typography>
          <TextField
            label="因子标识列表"
            value={backfillNames}
            onChange={(e) => setBackfillNames(e.target.value)}
            multiline
            minRows={2}
            maxRows={3}
            fullWidth
            placeholder="逗号或换行分隔，如 pe_ttm, pb, roe"
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="开始日期"
              type="date"
              value={backfillStart}
              onChange={(e) => setBackfillStart(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="结束日期"
              type="date"
              value={backfillEnd}
              onChange={(e) => setBackfillEnd(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button variant="contained" onClick={handleBackfill} disabled={backfillLoading}>
              {backfillLoading ? '提交中...' : '触发回补'}
            </Button>
          </Box>
          {backfillMsg && (
            <Alert severity={backfillMsg.includes('失败') ? 'error' : 'success'} sx={{ mt: 2 }}>
              {backfillMsg}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
