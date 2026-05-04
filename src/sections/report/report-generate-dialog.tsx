import type {
  ReportType,
  ReportFormat,
  CreateStrategyResearchReportParams,
} from 'src/api/report';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import {
  createStockReport,
  createBacktestReport,
  createPortfolioReport,
  createStrategyResearchReport,
} from 'src/api/report';

import { GenerateFormStock } from './generate/generate-form-stock';
import { GenerateFormBacktest } from './generate/generate-form-backtest';
import { GenerateFormStrategy } from './generate/generate-form-strategy';
import { GenerateFormPortfolio } from './generate/generate-form-portfolio';
import {
  REPORT_TYPE_OPTIONS,
  REPORT_FORMAT_OPTIONS,
} from './generate/types';

import type {
  GenerateParams,
  GenerateStockParams,
  GenerateBacktestParams,
  GenerateStrategyParams,
  GeneratePortfolioParams,
} from './generate/types';

// ─── Public props ──────────────────────────────────────────────────────────

export type ReportGenerateDialogProps = {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
  defaultType?: ReportType;
  defaultParams?: Record<string, unknown>;
};

// ─── Component ─────────────────────────────────────────────────────────────

export function ReportGenerateDialog({
  open,
  onClose,
  onGenerated,
  defaultType = 'BACKTEST',
  defaultParams,
}: ReportGenerateDialogProps) {
  const [reportType, setReportType] = useState<ReportType>(defaultType);
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<ReportFormat>('JSON');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [backtestParams, setBacktestParams] = useState<GenerateBacktestParams>({
    runId: (defaultParams?.runId as string) ?? '',
  });
  const [stockParams, setStockParams] = useState<GenerateStockParams>({
    tsCode: (defaultParams?.tsCode as string) ?? '',
  });
  const [portfolioParams, setPortfolioParams] = useState<GeneratePortfolioParams>({
    portfolioId: (defaultParams?.portfolioId as string) ?? '',
  });
  const [strategyParams, setStrategyParams] = useState<GenerateStrategyParams>({
    backtestRunId:
      (defaultParams?.backtestRunId as string) ?? (defaultParams?.runId as string) ?? '',
    strategyId: (defaultParams?.strategyId as string) ?? undefined,
    portfolioId:
      (defaultParams?.srPortfolioId as string) ??
      (defaultParams?.portfolioId as string) ??
      undefined,
    sections: {
      performance: true,
      holdings: true,
      riskAssessment: true,
      tradeLog: true,
    },
  });

  const [valid, setValid] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    setReportType(defaultType);
    setTitle('');
    setFormat('JSON');
    setErrorMsg('');
  }, [open, defaultType]);

  const submitDisabled = useMemo(() => submitting || !valid, [submitting, valid]);

  const handleSubmit = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      if (reportType === 'BACKTEST') {
        await createBacktestReport({
          runId: backtestParams.runId.trim(),
          title: title || undefined,
          format,
        });
      } else if (reportType === 'STOCK') {
        await createStockReport({
          tsCode: stockParams.tsCode.trim(),
          title: title || undefined,
          format,
        });
      } else if (reportType === 'PORTFOLIO') {
        await createPortfolioReport({
          portfolioId: portfolioParams.portfolioId.trim(),
          title: title || undefined,
          format,
        });
      } else if (reportType === 'STRATEGY_RESEARCH') {
        const payload: CreateStrategyResearchReportParams = {
          backtestRunId: strategyParams.backtestRunId.trim(),
          strategyId: strategyParams.strategyId || undefined,
          portfolioId: strategyParams.portfolioId || undefined,
          title: title || undefined,
          format,
          sections: strategyParams.sections,
        };
        await createStrategyResearchReport(payload);
      }
      onGenerated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '生成失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>生成量化报告</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {/* Type picker */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              报告类型
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={reportType}
              onChange={(_, v) => {
                if (v) setReportType(v as ReportType);
              }}
              fullWidth
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1,
                '& .MuiToggleButton-root': { borderRadius: 1, textTransform: 'none' },
              }}
            >
              {REPORT_TYPE_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  <Box sx={{ textAlign: 'left', width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                      {opt.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', fontSize: 12 }}
                    >
                      {opt.description}
                    </Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Title */}
          <TextField
            label="报告标题（可选）"
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            placeholder="留空将由系统自动生成"
          />

          {/* Format picker */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              输出格式
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={format}
              onChange={(_, v) => {
                if (v) setFormat(v as ReportFormat);
              }}
              fullWidth
              sx={{
                '& .MuiToggleButton-root': { borderRadius: 1, textTransform: 'none' },
              }}
            >
              {REPORT_FORMAT_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                      {opt.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', fontSize: 11 }}
                    >
                      {opt.description}
                    </Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Type-specific form */}
          {reportType === 'BACKTEST' && (
            <GenerateFormBacktest
              value={backtestParams}
              onChange={setBacktestParams}
              onValidChange={setValid}
            />
          )}
          {reportType === 'STOCK' && (
            <GenerateFormStock
              value={stockParams}
              onChange={setStockParams}
              onValidChange={setValid}
            />
          )}
          {reportType === 'PORTFOLIO' && (
            <GenerateFormPortfolio
              value={portfolioParams}
              onChange={setPortfolioParams}
              onValidChange={setValid}
            />
          )}
          {reportType === 'STRATEGY_RESEARCH' && (
            <GenerateFormStrategy
              value={strategyParams}
              onChange={setStrategyParams}
              onValidChange={setValid}
            />
          )}

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitDisabled}>
          {submitting ? '提交中…' : '生成'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Re-export types so callers can keep current import path working
export type { GenerateParams };
