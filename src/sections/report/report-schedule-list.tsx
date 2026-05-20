import type { ReportSchedule } from 'src/api/report';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { listSchedules, updateSchedule, deleteSchedule, runScheduleNow } from 'src/api/report';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { REPORT_TYPE_LABELS, REPORT_TYPE_COLORS } from './constants';

// ----------------------------------------------------------------------

const FREQ_LABELS: Record<string, string> = {
  DAILY: '每日',
  WEEKLY: '每周',
  MONTHLY: '每月',
};

type Props = {
  onEdit: (schedule: ReportSchedule) => void;
  onAdd: () => void;
};

export function ReportScheduleList({ onEdit, onAdd }: Props) {
  const [items, setItems] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listSchedules();
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载定时报告失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (schedule: ReportSchedule) => {
    try {
      await updateSchedule(schedule.id, { enabled: !schedule.enabled });
      setItems((prev) =>
        prev.map((s) => (s.id === schedule.id ? { ...s, enabled: !s.enabled } : s))
      );
    } catch (err) {
      console.error('切换启用状态失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('删除定时报告失败', err);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await runScheduleNow(id);
    } catch (err) {
      console.error('立即运行失败', err);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Card>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">定时报告</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          onClick={onAdd}
        >
          新建定时报告
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>报告名称</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>频率</TableCell>
              <TableCell>格式</TableCell>
              <TableCell>上次运行</TableCell>
              <TableCell>下次运行</TableCell>
              <TableCell>启用</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">暂无定时报告</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    <Label color={(REPORT_TYPE_COLORS[row.type] ?? 'default') as any}>
                      {REPORT_TYPE_LABELS[row.type] ?? row.type}
                    </Label>
                  </TableCell>
                  <TableCell>{FREQ_LABELS[row.frequency] ?? row.frequency}</TableCell>
                  <TableCell>{row.format}</TableCell>
                  <TableCell>{row.lastRunAt ? fDateTime(row.lastRunAt) : '—'}</TableCell>
                  <TableCell>{row.nextRunAt ? fDateTime(row.nextRunAt) : '—'}</TableCell>
                  <TableCell>
                    <Switch size="small" checked={row.enabled} onChange={() => handleToggle(row)} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => onEdit(row)}>
                        <Iconify icon="solar:pen-bold" width={18} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleRunNow(row.id)}>
                        <Iconify icon="solar:play-bold" width={18} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
