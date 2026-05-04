import type {
  ReportType,
  ReportFormat,
  ReportSchedule,
  CreateScheduleBody,
  ReportScheduleFrequency,
} from 'src/api/report';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { createSchedule, updateSchedule } from 'src/api/report';

import { GenerateFormStock } from './generate/generate-form-stock';
import { GenerateFormBacktest } from './generate/generate-form-backtest';
import { GenerateFormStrategy } from './generate/generate-form-strategy';
import { GenerateFormPortfolio } from './generate/generate-form-portfolio';

import type {
  GenerateStockParams,
  GenerateBacktestParams,
  GenerateStrategyParams,
  GeneratePortfolioParams,
} from './generate/types';

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
  const [errorMsg, setErrorMsg] = useState('');

  // Per-type params
  const [backtestParams, setBacktestParams] = useState<GenerateBacktestParams>({ runId: '' });
  const [stockParams, setStockParams] = useState<GenerateStockParams>({ tsCode: '' });
  const [portfolioParams, setPortfolioParams] = useState<GeneratePortfolioParams>({ portfolioId: '' });
  const [strategyParams, setStrategyParams] = useState<GenerateStrategyParams>({
    backtestRunId: '',
    sections: { performance: true, holdings: true, riskAssessment: true, tradeLog: true },
  });
  const [formValid, setFormValid] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrorMsg('');
    if (editingSchedule) {
      setTitle(editingSchedule.title);
      setType(editingSchedule.type);
      setFormat(editingSchedule.format);
      setFrequency(editingSchedule.frequency);
      const p = (editingSchedule.params ?? {}) as Record<string, unknown>;
      // hydrate per-type params
      setBacktestParams({ runId: (p.runId as string) ?? '' });
      setStockParams({ tsCode: (p.tsCode as string) ?? '' });
      setPortfolioParams({ portfolioId: (p.portfolioId as string) ?? '' });
      setStrategyParams({
        backtestRunId: (p.backtestRunId as string) ?? '',
        strategyId: p.strategyId as string | undefined,
        portfolioId: p.portfolioId as string | undefined,
        sections: (p.sections as GenerateStrategyParams['sections']) ?? {
          performance: true,
          holdings: true,
          riskAssessment: true,
          tradeLog: true,
        },
      });
    } else {
      setTitle('');
      setType('BACKTEST');
      setFormat('HTML');
      setFrequency('DAILY');
      setHour('18');
      setDayOfWeek('1');
      setDayOfMonth('1');
      setBacktestParams({ runId: '' });
      setStockParams({ tsCode: '' });
      setPortfolioParams({ portfolioId: '' });
      setStrategyParams({
        backtestRunId: '',
        sections: { performance: true, holdings: true, riskAssessment: true, tradeLog: true },
      });
    }
  }, [editingSchedule, open]);

  const currentParams = useMemo<Record<string, unknown>>(() => {
    if (type === 'BACKTEST') return backtestParams as unknown as Record<string, unknown>;
    if (type === 'STOCK') return stockParams as unknown as Record<string, unknown>;
    if (type === 'PORTFOLIO') return portfolioParams as unknown as Record<string, unknown>;
    return strategyParams as unknown as Record<string, unknown>;
  }, [type, backtestParams, stockParams, portfolioParams, strategyParams]);

  const buildCron = (): string => {
    const h = parseInt(hour, 10) || 18;
    if (frequency === 'DAILY') return `0 ${h} * * 1-5`;
    if (frequency === 'WEEKLY') return `0 ${h} * * ${dayOfWeek}`;
    return `0 ${h} ${dayOfMonth} * *`;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const body: CreateScheduleBody = {
        type,
        title,
        params: currentParams,
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
      setErrorMsg(err instanceof Error ? err.message : '保存定时报告失败');
    } finally {
      setSaving(false);
    }
  };

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const submitDisabled = saving || !title.trim() || !formValid;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingSchedule ? '编辑定时报告' : '新建定时报告'}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField
            label="报告名称"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            size="small"
            required
          />

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              报告类型
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={type}
              onChange={(_, v) => {
                if (v) setType(v as ReportType);
              }}
              fullWidth
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1,
                '& .MuiToggleButton-root': { borderRadius: 1, textTransform: 'none' },
              }}
            >
              {REPORT_TYPES.map((t) => (
                <ToggleButton key={t.value} value={t.value}>
                  {t.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Per-type params (smart pickers) */}
          {type === 'BACKTEST' && (
            <GenerateFormBacktest
              value={backtestParams}
              onChange={setBacktestParams}
              onValidChange={setFormValid}
              compact
            />
          )}
          {type === 'STOCK' && (
            <GenerateFormStock
              value={stockParams}
              onChange={setStockParams}
              onValidChange={setFormValid}
            />
          )}
          {type === 'PORTFOLIO' && (
            <GenerateFormPortfolio
              value={portfolioParams}
              onChange={setPortfolioParams}
              onValidChange={setFormValid}
              compact
            />
          )}
          {type === 'STRATEGY_RESEARCH' && (
            <GenerateFormStrategy
              value={strategyParams}
              onChange={setStrategyParams}
              onValidChange={setFormValid}
            />
          )}

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

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitDisabled}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
