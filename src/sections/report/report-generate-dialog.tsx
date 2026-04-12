import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import {
  type ReportType,
  createStockReport,
  type ReportFormat,
  createBacktestReport,
  createPortfolioReport,
  createStrategyResearchReport,
} from 'src/api/report';

// ── Types ─────────────────────────────────────────────────────

type ReportGenerateDialogProps = {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
  defaultType?: ReportType;
  defaultParams?: Record<string, unknown>;
};

// ── Component ─────────────────────────────────────────────────

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

  // Backtest
  const [runId, setRunId] = useState((defaultParams?.runId as string) ?? '');
  // Stock
  const [tsCode, setTsCode] = useState((defaultParams?.tsCode as string) ?? '');
  // Portfolio
  const [portfolioId, setPortfolioId] = useState((defaultParams?.portfolioId as string) ?? '');
  // Strategy research
  const [backtestRunId, setBacktestRunId] = useState(
    (defaultParams?.backtestRunId as string) ?? ''
  );
  const [strategyId, setStrategyId] = useState((defaultParams?.strategyId as string) ?? '');
  const [srPortfolioId, setSrPortfolioId] = useState(
    (defaultParams?.srPortfolioId as string) ?? ''
  );
  const [secPerformance, setSecPerformance] = useState(true);
  const [secHoldings, setSecHoldings] = useState(true);
  const [secRisk, setSecRisk] = useState(true);
  const [secTradeLog, setSecTradeLog] = useState(true);

  const handleSubmit = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      if (reportType === 'BACKTEST') {
        if (!runId.trim()) {
          setErrorMsg('请填写回测运行 ID');
          return;
        }
        await createBacktestReport({ runId: runId.trim(), title: title || undefined, format });
      } else if (reportType === 'STOCK') {
        if (!tsCode.trim()) {
          setErrorMsg('请填写股票代码');
          return;
        }
        await createStockReport({
          tsCode: tsCode.trim(),
          title: title || undefined,
          format,
        });
      } else if (reportType === 'PORTFOLIO') {
        if (!portfolioId.trim()) {
          setErrorMsg('请填写组合 ID');
          return;
        }
        await createPortfolioReport({
          portfolioId: portfolioId.trim(),
          title: title || undefined,
          format,
        });
      } else if (reportType === 'STRATEGY_RESEARCH') {
        if (!backtestRunId.trim()) {
          setErrorMsg('请填写回测运行 ID');
          return;
        }
        await createStrategyResearchReport({
          backtestRunId: backtestRunId.trim(),
          strategyId: strategyId.trim() || undefined,
          portfolioId: srPortfolioId.trim() || undefined,
          title: title || undefined,
          format,
          sections: {
            performance: secPerformance,
            holdings: secHoldings,
            riskAssessment: secRisk,
            tradeLog: secTradeLog,
          },
        });
      }
      onGenerated();
    } catch (err: any) {
      setErrorMsg(err?.message ?? '生成失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>生成量化报告</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* 报告类型 */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              报告类型
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={reportType}
              onChange={(_, v) => v && setReportType(v)}
              size="small"
              fullWidth
            >
              <ToggleButton value="BACKTEST">回测报告</ToggleButton>
              <ToggleButton value="STOCK">个股研报</ToggleButton>
              <ToggleButton value="PORTFOLIO">组合报告</ToggleButton>
              <ToggleButton value="STRATEGY_RESEARCH">策略研究</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* 报告标题（可选） */}
          <TextField
            label="报告标题（可选）"
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />

          {/* 输出格式 */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              输出格式
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={format}
              onChange={(_, v) => v && setFormat(v)}
              size="small"
            >
              <ToggleButton value="JSON">JSON（在线查看）</ToggleButton>
              <ToggleButton value="HTML">HTML（网页）</ToggleButton>
              <ToggleButton value="PDF">PDF（文档）</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* 类型专属字段 */}
          {reportType === 'BACKTEST' && (
            <TextField
              label="回测运行 ID"
              size="small"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              fullWidth
              required
            />
          )}

          {reportType === 'STOCK' && (
            <TextField
              label="股票代码"
              size="small"
              placeholder="如 000001.SZ"
              value={tsCode}
              onChange={(e) => setTsCode(e.target.value)}
              fullWidth
              required
            />
          )}

          {reportType === 'PORTFOLIO' && (
            <TextField
              label="组合 ID"
              size="small"
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              fullWidth
              required
            />
          )}

          {reportType === 'STRATEGY_RESEARCH' && (
            <>
              <TextField
                label="回测运行 ID"
                size="small"
                value={backtestRunId}
                onChange={(e) => setBacktestRunId(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="策略 ID（可选）"
                size="small"
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                fullWidth
              />
              <TextField
                label="组合 ID（可选）"
                size="small"
                value={srPortfolioId}
                onChange={(e) => setSrPortfolioId(e.target.value)}
                fullWidth
              />
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  包含章节
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={secPerformance}
                        onChange={(e) => setSecPerformance(e.target.checked)}
                      />
                    }
                    label="回测表现"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={secHoldings}
                        onChange={(e) => setSecHoldings(e.target.checked)}
                      />
                    }
                    label="持仓分析"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox checked={secRisk} onChange={(e) => setSecRisk(e.target.checked)} />
                    }
                    label="风险评估"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={secTradeLog}
                        onChange={(e) => setSecTradeLog(e.target.checked)}
                      />
                    }
                    label="交易日志"
                  />
                </Box>
              </Box>
            </>
          )}

          {errorMsg && (
            <Typography variant="body2" color="error">
              {errorMsg}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '提交中…' : '生成'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
