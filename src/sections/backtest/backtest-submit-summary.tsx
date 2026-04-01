import type { ValidateBacktestRunResponse } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import {
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  STRATEGY_TYPE_LABEL,
  REBALANCE_FREQUENCY_OPTIONS,
} from './constants';

import type { BacktestRunForm } from './types';

// ----------------------------------------------------------------------

interface BacktestSubmitSummaryProps {
  form: BacktestRunForm;
  selectedTemplateId: string;
  validation: ValidateBacktestRunResponse | null;
  validating: boolean;
  submitting: boolean;
  onValidate: () => void;
  onSubmit: () => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
        {value}
      </Typography>
    </Box>
  );
}

export function BacktestSubmitSummary({
  form,
  selectedTemplateId,
  validation,
  validating,
  submitting,
  onValidate,
  onSubmit,
}: BacktestSubmitSummaryProps) {
  const benchmarkLabel =
    BENCHMARK_OPTIONS.find((o) => o.value === form.benchmarkTsCode)?.label ?? form.benchmarkTsCode;
  const universeLabel =
    UNIVERSE_OPTIONS.find((o) => o.value === form.universe)?.label ?? form.universe;
  const freqLabel =
    REBALANCE_FREQUENCY_OPTIONS.find((o) => o.value === form.rebalanceFrequency)?.label ??
    form.rebalanceFrequency;
  const strategyLabel = STRATEGY_TYPE_LABEL[selectedTemplateId] ?? selectedTemplateId;

  const canSubmit = validation !== null && validation.errors.length === 0;

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
        <SummaryRow label="手续费率" value={`${(form.commissionRate * 10000).toFixed(1)} bps`} />
        <Divider />
        <SummaryRow label="滑点" value={`${form.slippageBps} bps`} />

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
            {validating ? '校验中...' : '校验配置'}
          </Button>

          <Button
            variant="contained"
            fullWidth
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            startIcon={
              submitting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Iconify icon="solar:play-bold" />
              )
            }
          >
            {submitting ? '提交中...' : '开始回测'}
          </Button>

          {!validation && (
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              请先校验配置，再提交任务
            </Typography>
          )}

          {validation && validation.errors.length > 0 && (
            <Typography variant="caption" sx={{ color: 'error.main', textAlign: 'center' }}>
              存在校验错误，无法提交
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
