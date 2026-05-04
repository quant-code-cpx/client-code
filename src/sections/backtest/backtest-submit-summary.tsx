import type { ValidateBacktestRunResponse } from 'src/api/backtest';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import {
  DEFAULT_FORM,
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  STRATEGY_TYPE_LABEL,
  buildDefaultStrategyConfig,
  REBALANCE_FREQUENCY_OPTIONS,
} from './constants';

import type { BacktestRunForm } from './types';

// ----------------------------------------------------------------------

interface BacktestSubmitSummaryProps {
  form: BacktestRunForm;
  selectedTemplateId: string;
  validation: ValidateBacktestRunResponse | null;
  validating: boolean;
  validationStale?: boolean;
  submitting: boolean;
  onValidate: () => void;
  onSubmit: () => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.75 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          textAlign: 'right',
          maxWidth: '65%',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatRuntime(seconds: number | undefined) {
  if (seconds == null) return '';
  if (seconds < 60) return `（预计 ~${Math.max(1, Math.round(seconds))}s）`;
  return `（预计 ~${Math.round(seconds / 60)}min）`;
}

function buildChangedRows(form: BacktestRunForm, selectedTemplateId: string) {
  const rows: Array<{ label: string; value: string }> = [];
  const defaults = DEFAULT_FORM;
  const defaultStrategyConfig = buildDefaultStrategyConfig(selectedTemplateId);

  const publicFields: Array<{
    key: keyof BacktestRunForm;
    label: string;
    format?: (value: unknown) => string;
  }> = [
    { key: 'startDate', label: '起始日期' },
    { key: 'endDate', label: '结束日期' },
    {
      key: 'initialCapital',
      label: '初始资金',
      format: (value) => `¥ ${fNumber(value as number)}`,
    },
    { key: 'benchmarkTsCode', label: '基准指数' },
    { key: 'universe', label: '股票池' },
    { key: 'rebalanceFrequency', label: '调仓频率' },
    { key: 'priceMode', label: '成交模式' },
    {
      key: 'commissionRate',
      label: '手续费率',
      format: (value) => `${Number(value) * 10000} / 万`,
    },
    { key: 'stampDutyRate', label: '印花税率', format: (value) => `${Number(value) * 10000} / 万` },
    { key: 'slippageBps', label: '滑点', format: (value) => `${value} bps` },
    { key: 'maxPositions', label: '最大持仓' },
    { key: 'maxWeightPerStock', label: '单票上限', format: (value) => `${Number(value) * 100}%` },
    { key: 'minDaysListed', label: '最小上市天数', format: (value) => `${value} 天` },
  ];

  publicFields.forEach(({ key, label, format }) => {
    if (!sameValue(form[key], defaults[key])) {
      rows.push({ label, value: format ? format(form[key]) : String(form[key]) });
    }
  });

  Object.entries(form.strategyConfig).forEach(([key, value]) => {
    if (!sameValue(value, defaultStrategyConfig[key])) {
      rows.push({ label: `策略参数.${key}`, value: String(value) });
    }
  });

  return rows;
}

export function BacktestSubmitSummary({
  form,
  selectedTemplateId,
  validation,
  validating,
  validationStale = false,
  submitting,
  onValidate,
  onSubmit,
}: BacktestSubmitSummaryProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  const benchmarkLabel =
    BENCHMARK_OPTIONS.find((option) => option.value === form.benchmarkTsCode)?.label ??
    form.benchmarkTsCode;
  const universeLabel =
    UNIVERSE_OPTIONS.find((option) => option.value === form.universe)?.label ?? form.universe;
  const freqLabel =
    REBALANCE_FREQUENCY_OPTIONS.find((option) => option.value === form.rebalanceFrequency)?.label ??
    form.rebalanceFrequency;
  const strategyLabel = STRATEGY_TYPE_LABEL[selectedTemplateId] ?? selectedTemplateId;
  const runtimeLabel = formatRuntime(validation?.estimatedRuntimeSeconds);
  const changedRows = useMemo(
    () => buildChangedRows(form, selectedTemplateId),
    [form, selectedTemplateId]
  );

  const canSubmit =
    validation !== null &&
    validation.errors.length === 0 &&
    !validationStale &&
    !validating &&
    !submitting;

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          提交摘要
        </Typography>

        <SummaryRow label="策略类型" value={strategyLabel} />
        <Divider />
        <SummaryRow label="回测区间" value={`${form.startDate} ~ ${form.endDate}`} />
        <Divider />
        <SummaryRow label="基准指数" value={benchmarkLabel} />
        <Divider />
        <SummaryRow label="股票池" value={universeLabel} />
        <Divider />
        <SummaryRow label="调仓频率" value={freqLabel} />
        <Divider />
        <SummaryRow label="初始资金" value={`¥ ${fNumber(form.initialCapital)}`} />
        <Divider />
        <SummaryRow
          label="交易成本"
          value={`${(form.commissionRate * 10000).toFixed(2)} / 万 + ${form.slippageBps} bps`}
        />

        <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1 }}>
            <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
              偏离默认参数：{changedRows.length} 项
            </Typography>
            <IconButton
              size="small"
              aria-label={diffOpen ? '收起偏离默认参数' : '展开偏离默认参数'}
              onClick={() => setDiffOpen((open) => !open)}
            >
              <Iconify
                icon={diffOpen ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                width={16}
              />
            </IconButton>
          </Box>
          <Collapse in={diffOpen} timeout={180} unmountOnExit>
            <Divider />
            <Box sx={{ px: 1.5, py: 1 }}>
              {changedRows.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  当前配置与默认参数一致。
                </Typography>
              ) : (
                changedRows
                  .slice(0, 8)
                  .map((row) => <SummaryRow key={row.label} label={row.label} value={row.value} />)
              )}
              {changedRows.length > 8 ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  另有 {changedRows.length - 8} 项变更已折叠。
                </Typography>
              ) : null}
            </Box>
          </Collapse>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={onValidate}
            disabled={validating || submitting}
            startIcon={
              validating ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Iconify icon="solar:shield-check-bold" />
              )
            }
          >
            {validating ? '校验中...' : '立即校验'}
          </Button>

          <Button
            variant="contained"
            fullWidth
            onClick={onSubmit}
            disabled={!canSubmit}
            startIcon={
              submitting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Iconify icon="solar:play-bold" />
              )
            }
          >
            {submitting ? '提交中...' : `开始回测${runtimeLabel}`}
          </Button>

          {!validation ? (
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              配置会自动校验；也可以手动点击「立即校验」
            </Typography>
          ) : null}

          {validationStale ? (
            <Typography variant="caption" sx={{ color: 'info.main', textAlign: 'center' }}>
              配置已变更，等待最新校验结果后即可提交
            </Typography>
          ) : null}

          {validation && validation.errors.length > 0 ? (
            <Typography variant="caption" sx={{ color: 'error.main', textAlign: 'center' }}>
              存在校验错误，无法提交
            </Typography>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
