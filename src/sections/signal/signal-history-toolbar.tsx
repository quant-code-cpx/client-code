import type {
  SignalAction,
  SignalForwardWindow,
  SignalActivationItem,
  SignalHistoryViewMode,
} from 'src/api/signal';

import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

// ----------------------------------------------------------------------

export type SignalHistoryFilter = {
  strategyId: string;
  startDate: string;
  endDate: string;
  actions: SignalAction[];
  stockKeyword: string;
  confidenceMin: number;
  confidenceMax: number;
  forwardWindow: SignalForwardWindow;
  viewMode: SignalHistoryViewMode;
  showHold: boolean;
  page: number;
  pageSize: number;
};

type Props = {
  draft: SignalHistoryFilter;
  activations: SignalActivationItem[];
  loadingActivations: boolean;
  activationsError: string;
  hasDirty: boolean;
  onDraftChange: (patch: Partial<SignalHistoryFilter>) => void;
  onApply: () => void;
  onReset: () => void;
  onRetryActivations: () => void;
};

const ACTION_OPTIONS: Array<{ value: SignalAction; label: string }> = [
  { value: 'BUY', label: '买入' },
  { value: 'SELL', label: '卖出' },
  { value: 'HOLD', label: '持有' },
];

const WINDOW_OPTIONS: Array<{ value: SignalForwardWindow; label: string }> = [
  { value: 1, label: 'T+1' },
  { value: 5, label: 'T+5' },
  { value: 20, label: 'T+20' },
];

export function SignalHistoryToolbar({
  draft,
  activations,
  loadingActivations,
  activationsError,
  hasDirty,
  onDraftChange,
  onApply,
  onReset,
  onRetryActivations,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const dateError = Boolean(
    draft.startDate &&
      draft.endDate &&
      dayjs(toDisplayDate(draft.startDate)).isAfter(dayjs(toDisplayDate(draft.endDate)))
  );

  const compareHref = useMemo(() => {
    const params = new URLSearchParams();
    if (draft.strategyId) params.set('strategyIds', draft.strategyId);
    if (draft.startDate) params.set('startDate', draft.startDate);
    if (draft.endDate) params.set('endDate', draft.endDate);
    params.set('forwardWindow', String(draft.forwardWindow));
    return `/strategy/signal/history/compare?${params.toString()}`;
  }, [draft.endDate, draft.forwardWindow, draft.startDate, draft.strategyId]);

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      {activationsError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onRetryActivations}>
              重试
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {activationsError}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1.5}
        alignItems={{ lg: 'center' }}
        sx={{ flexWrap: 'wrap' }}
      >
        <TextField
          select
          size="small"
          label="策略选择"
          value={draft.strategyId}
          onChange={(e) => onDraftChange({ strategyId: e.target.value })}
          sx={{ minWidth: 220 }}
          disabled={loadingActivations || activations.length === 0}
        >
          {activations.map((activation) => (
            <MenuItem key={activation.strategyId} value={activation.strategyId}>
              {activation.strategyName}
            </MenuItem>
          ))}
        </TextField>

        <ToggleButtonGroup
          exclusive
          aria-label="快捷时间范围"
          size="small"
          value={getQuickRange(draft.startDate, draft.endDate)}
          onChange={(_, value) => {
            if (!value) return;
            onDraftChange(getQuickRangePatch(value));
          }}
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="7">近7天</ToggleButton>
          <ToggleButton value="30">近30天</ToggleButton>
          <ToggleButton value="90">近90天</ToggleButton>
          <ToggleButton value="month">本月</ToggleButton>
          <ToggleButton value="quarter">季初至今</ToggleButton>
          <ToggleButton value="custom">自定义</ToggleButton>
        </ToggleButtonGroup>

        <DatePicker
          label="起始日期"
          value={draft.startDate ? dayjs(toDisplayDate(draft.startDate)) : null}
          onChange={(value) => onDraftChange({ startDate: value?.format('YYYYMMDD') ?? '' })}
          shouldDisableDate={shouldDisableDate}
          slotProps={{
            textField: {
              error: dateError,
            },
          }}
        />

        <DatePicker
          label="截止日期"
          value={draft.endDate ? dayjs(toDisplayDate(draft.endDate)) : null}
          onChange={(value) => onDraftChange({ endDate: value?.format('YYYYMMDD') ?? '' })}
          shouldDisableDate={shouldDisableDate}
          slotProps={{
            textField: {
              error: dateError,
            },
          }}
        />

        <Badge color="error" variant="dot" invisible={!hasDirty}>
          <Button
            variant="contained"
            onClick={onApply}
            disabled={!draft.strategyId || dateError}
            startIcon={<Iconify icon="solar:magnifier-bold" />}
          >
            查询
          </Button>
        </Badge>

        <Button
          variant="outlined"
          onClick={onReset}
          startIcon={<Iconify icon="solar:restart-bold" />}
        >
          重置
        </Button>

        <Button
          component={RouterLink}
          href={compareHref}
          variant="outlined"
          startIcon={<Iconify icon="solar:copy-bold" />}
        >
          对比策略
        </Button>
      </Stack>

      {dateError && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          起始日期不能晚于截止日期
        </Typography>
      )}

      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          size="small"
          color="inherit"
          onClick={() => setAdvancedOpen((prev) => !prev)}
          startIcon={
            <Iconify
              icon={advancedOpen ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
            />
          }
        >
          高级筛选
        </Button>
        {hasDirty && <Chip size="small" color="warning" variant="outlined" label="有未应用变更" />}
      </Box>

      <Collapse in={advancedOpen}>
        <Box
          sx={{ pt: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              操作类型
            </Typography>
            <ToggleButtonGroup
              size="small"
              aria-label="操作类型筛选"
              value={draft.actions}
              onChange={(_, value: SignalAction[]) => onDraftChange({ actions: value })}
            >
              {ACTION_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <TextField
            size="small"
            label="股票关键词"
            placeholder="代码 / 名称"
            value={draft.stockKeyword}
            onChange={(e) => onDraftChange({ stockKeyword: e.target.value })}
          />

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              置信度区间：{(draft.confidenceMin * 100).toFixed(0)}% –{' '}
              {(draft.confidenceMax * 100).toFixed(0)}%
            </Typography>
            <Slider
              aria-label="置信度区间"
              size="small"
              min={0}
              max={1}
              step={0.05}
              value={[draft.confidenceMin, draft.confidenceMax]}
              onChange={(_, value) => {
                const [min, max] = value as number[];
                onDraftChange({ confidenceMin: min, confidenceMax: max });
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <ToggleButtonGroup
              exclusive
              aria-label="前瞻收益窗口"
              size="small"
              value={draft.forwardWindow}
              onChange={(_, value: SignalForwardWindow | null) => {
                if (value) onDraftChange({ forwardWindow: value });
              }}
            >
              {WINDOW_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <ToggleButtonGroup
              exclusive
              aria-label="历史展示模式"
              size="small"
              value={draft.viewMode}
              onChange={(_, value: SignalHistoryViewMode | null) => {
                if (value) onDraftChange({ viewMode: value });
              }}
            >
              <ToggleButton value="raw">原始信号</ToggleButton>
              <ToggleButton value="position">持仓状态</ToggleButton>
            </ToggleButtonGroup>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={draft.showHold}
                  onChange={(e) => onDraftChange({ showHold: e.target.checked })}
                />
              }
              label="显示持有信号"
            />
          </Box>
        </Box>
      </Collapse>
    </Card>
  );
}

// ----------------------------------------------------------------------

function shouldDisableDate(value: dayjs.Dayjs) {
  return value.isAfter(dayjs(), 'day') || value.day() === 0 || value.day() === 6;
}

function toDisplayDate(value: string) {
  if (!/^\d{8}$/.test(value)) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function getQuickRangePatch(range: string): Partial<SignalHistoryFilter> {
  const today = dayjs();
  if (range === '7')
    return {
      startDate: today.subtract(6, 'day').format('YYYYMMDD'),
      endDate: today.format('YYYYMMDD'),
    };
  if (range === '30')
    return {
      startDate: today.subtract(29, 'day').format('YYYYMMDD'),
      endDate: today.format('YYYYMMDD'),
    };
  if (range === '90')
    return {
      startDate: today.subtract(89, 'day').format('YYYYMMDD'),
      endDate: today.format('YYYYMMDD'),
    };
  if (range === 'month')
    return {
      startDate: today.startOf('month').format('YYYYMMDD'),
      endDate: today.format('YYYYMMDD'),
    };
  if (range === 'quarter')
    return {
      startDate: getQuarterStart(today).format('YYYYMMDD'),
      endDate: today.format('YYYYMMDD'),
    };
  return {};
}

function getQuickRange(startDate: string, endDate: string) {
  const today = dayjs().format('YYYYMMDD');
  if (endDate !== today) return 'custom';
  if (startDate === dayjs().subtract(6, 'day').format('YYYYMMDD')) return '7';
  if (startDate === dayjs().subtract(29, 'day').format('YYYYMMDD')) return '30';
  if (startDate === dayjs().subtract(89, 'day').format('YYYYMMDD')) return '90';
  if (startDate === dayjs().startOf('month').format('YYYYMMDD')) return 'month';
  if (startDate === getQuarterStart(dayjs()).format('YYYYMMDD')) return 'quarter';
  return 'custom';
}

function getQuarterStart(value: dayjs.Dayjs) {
  const month = value.month();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  return value.month(quarterStartMonth).startOf('month');
}
