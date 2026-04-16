import type {
  ReportType,
  ReportFormat,
  ReportSchedule,
  CreateScheduleBody,
  ReportScheduleFrequency,
} from 'src/api/report';

import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { createSchedule, updateSchedule } from 'src/api/report';

// ----------------------------------------------------------------------

const REPORT_TYPES: Array<{ value: ReportType; label: string }> = [
  { value: 'BACKTEST', label: '回测报告' },
  { value: 'STOCK', label: '个股研报' },
  { value: 'PORTFOLIO', label: '组合报告' },
  { value: 'STRATEGY_RESEARCH', label: '策略研究' },
];

const FREQUENCIES: Array<{ value: ReportScheduleFrequency; label: string }> = [
  { value: 'DAILY', label: '每日' },
  { value: 'WEEKLY', label: '每周' },
  { value: 'MONTHLY', label: '每月' },
];

const FORMATS: Array<{ value: ReportFormat; label: string }> = [
  { value: 'HTML', label: 'HTML' },
  { value: 'PDF', label: 'PDF' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingSchedule?: ReportSchedule | null;
};

export function ReportScheduleDialog({ open, onClose, onSaved, editingSchedule }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReportType>('BACKTEST');
  const [format, setFormat] = useState<ReportFormat>('HTML');
  const [frequency, setFrequency] = useState<ReportScheduleFrequency>('DAILY');
  const [hour, setHour] = useState('18');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingSchedule) {
      setTitle(editingSchedule.title);
      setType(editingSchedule.type);
      setFormat(editingSchedule.format);
      setFrequency(editingSchedule.frequency);
    } else {
      setTitle('');
      setType('BACKTEST');
      setFormat('HTML');
      setFrequency('DAILY');
      setHour('18');
      setDayOfWeek('1');
      setDayOfMonth('1');
    }
  }, [editingSchedule, open]);

  const buildCron = (): string => {
    const h = parseInt(hour, 10) || 18;
    if (frequency === 'DAILY') return `0 ${h} * * 1-5`;
    if (frequency === 'WEEKLY') return `0 ${h} * * ${dayOfWeek}`;
    return `0 ${h} ${dayOfMonth} * *`;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const body: CreateScheduleBody = {
        type,
        title,
        params: {},
        format,
        frequency,
        cronExpression: buildCron(),
      };
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, body);
      } else {
        await createSchedule(body);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('保存定时报告失败', err);
    } finally {
      setSaving(false);
    }
  };

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingSchedule ? '编辑定时报告' : '新建定时报告'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="报告名称"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
          />

          <FormControl size="small" fullWidth>
            <InputLabel>报告类型</InputLabel>
            <Select
              value={type}
              label="报告类型"
              onChange={(e) => setType(e.target.value as ReportType)}
            >
              {REPORT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>输出格式</InputLabel>
            <Select
              value={format}
              label="输出格式"
              onChange={(e) => setFormat(e.target.value as ReportFormat)}
            >
              {FORMATS.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>执行频率</InputLabel>
            <Select
              value={frequency}
              label="执行频率"
              onChange={(e) => setFrequency(e.target.value as ReportScheduleFrequency)}
            >
              {FREQUENCIES.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="执行时间（小时，0-23）"
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            type="number"
            size="small"
            slotProps={{ htmlInput: { min: 0, max: 23 } }}
          />

          {frequency === 'WEEKLY' && (
            <FormControl size="small" fullWidth>
              <InputLabel>星期几</InputLabel>
              <Select
                value={dayOfWeek}
                label="星期几"
                onChange={(e) => setDayOfWeek(e.target.value)}
              >
                {weekDays.map((d, i) => (
                  <MenuItem key={i + 1} value={String(i + 1)}>
                    星期{d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {frequency === 'MONTHLY' && (
            <TextField
              label="每月第几日（1-28）"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              type="number"
              size="small"
              slotProps={{ htmlInput: { min: 1, max: 28 } }}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || !title.trim()}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
