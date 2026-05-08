import type { FactorDef, OrthogonalizeResult, OrthogonalizeRequest } from 'src/api/factor';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { orthogonalizeFactors } from 'src/api/factor';

import { defaultTradeDate } from '../utils';
import { METHODOLOGY } from '../methodology';
import { BE_PENDING_TOOLTIP } from '../constants';
import { EmptyGuide } from '../shared/empty-guide';
import { ResultCard } from '../shared/result-card';
import { ResultActions } from '../shared/result-actions';
import { CorrelationTable } from '../shared/correlation-table';
import { useAdvancedAnalysisRun } from '../use-advanced-analysis-run';

import type { AnalysisHistoryItem } from '../use-analysis-history';

// ----------------------------------------------------------------------

type Props = {
  allFactors: FactorDef[];
  universe: string;
  factors: string[];
  onFactorsCommit: (v: string[]) => void;
  onHistorySave: (entry: Omit<AnalysisHistoryItem, 'id' | 'createdAt'>) => void;
  /** 来自 history 抽屉的回填请求 */
  prefillRequest: OrthogonalizeRequest | null;
};

export function OrthogonalizePanel({
  allFactors,
  universe,
  factors,
  onFactorsCommit,
  onHistorySave,
  prefillRequest,
}: Props) {
  const [tradeDate, setTradeDate] = useState<dayjs.Dayjs>(() => defaultTradeDate());
  const [method, setMethod] = useState<'regression' | 'symmetric' | 'gram-schmidt'>('regression');

  const { data, loading, error, run, lastRequest, elapsedMs } = useAdvancedAnalysisRun<
    OrthogonalizeRequest,
    OrthogonalizeResult
  >(orthogonalizeFactors, '正交化失败');

  // 来自历史的回填
  useEffect(() => {
    if (!prefillRequest) return;
    if (prefillRequest.tradeDate) {
      setTradeDate(dayjs(prefillRequest.tradeDate, 'YYYYMMDD'));
    }
    if (prefillRequest.method) {
      setMethod(prefillRequest.method);
    }
  }, [prefillRequest]);

  const canRun = factors.length >= 2;
  const runDisabledReason = canRun ? '' : '请至少选择 2 个因子';

  const handleRun = useCallback(async () => {
    const req: OrthogonalizeRequest = {
      factorNames: factors,
      tradeDate: tradeDate.format('YYYYMMDD'),
      universe: universe || undefined,
      method,
    };
    const res = await run(req);
    onHistorySave({
      type: 'orthogonalize',
      request: req,
      summary: res
        ? `${factors.length} 因子 · ${method} · ${tradeDate.format('YYYY-MM-DD')}`
        : '运行失败',
      status: res ? 'success' : 'error',
      elapsedMs: null,
    });
  }, [factors, tradeDate, universe, method, run, onHistorySave]);

  const handleCopy = useCallback(() => {
    if (!data) return;
    void navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
  }, [data]);

  const subtitle = useMemo(() => {
    if (!data) return null;
    const elapsed = elapsedMs ? `${(elapsedMs / 1000).toFixed(1)}s` : '';
    return `方法：${data.method} · 交易日 ${data.tradeDate} · 因子数 ${data.factors.length}${elapsed ? ` · 耗时 ${elapsed}` : ''}`;
  }, [data, elapsedMs]);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <DatePicker
              label="分析日期"
              value={tradeDate}
              onChange={(v) => v && setTradeDate(v)}
              format="YYYY-MM-DD"
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 190 } },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>正交方法</InputLabel>
              <Select
                value={method}
                label="正交方法"
                onChange={(e) => setMethod(e.target.value as typeof method)}
              >
                <MenuItem value="regression">回归正交</MenuItem>
                <MenuItem value="symmetric">对称正交</MenuItem>
                <Tooltip title={BE_PENDING_TOOLTIP} placement="right">
                  <span>
                    <MenuItem value="gram-schmidt" disabled>
                      Gram-Schmidt（待后端 BE-1）
                    </MenuItem>
                  </span>
                </Tooltip>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title={runDisabledReason} placement="top">
              <span>
                <Button variant="contained" onClick={handleRun} disabled={!canRun || loading}>
                  {loading ? '运行中…' : '执行正交化'}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !data && !error && (
        <EmptyGuide
          title="开始你的第一次正交化分析"
          steps={[
            '在顶部上下文条选择 ≥2 个因子',
            '选择分析日期与正交方法',
            '点击「执行正交化」查看冗余度',
          ]}
        />
      )}

      {data && (
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <ResultCard
                title="正交化前 · 相关性矩阵"
                methodology={METHODOLOGY.orthogonalize}
                subtitle={subtitle}
                actions={
                  <ResultActions
                    onCopy={handleCopy}
                    nextActions={[
                      {
                        key: 'commit-factors',
                        label: '保留下来的因子覆盖共享上下文',
                        onClick: () => onFactorsCommit(data.factors),
                      },
                    ]}
                  />
                }
              >
                <CorrelationTable factors={data.factors} matrix={data.correlationBefore} />
              </ResultCard>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <ResultCard
                title="正交化后 · 相关性矩阵"
                pendingNotice={
                  data.residualVarianceRatio
                    ? undefined
                    : '残差方差占比图待后端 BE-1 上线（响应字段 residualVarianceRatio）'
                }
              >
                <CorrelationTable factors={data.factors} matrix={data.correlationAfter} />
              </ResultCard>
            </Box>
          </Stack>

          {data.residualVarianceRatio && (
            <ResultCard title="残差方差占比">
              <Stack spacing={1}>
                {data.factors.map((f, i) => {
                  const ratio = data.residualVarianceRatio?.[i] ?? 0;
                  return (
                    <Stack key={f} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ minWidth: 140 }}>
                        {f}
                      </Typography>
                      <Box
                        sx={{
                          flexGrow: 1,
                          height: 8,
                          borderRadius: 1,
                          bgcolor: 'background.neutral',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${(ratio * 100).toFixed(1)}%`,
                            height: '100%',
                            bgcolor: 'primary.main',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ minWidth: 60, textAlign: 'right' }}>
                        {(ratio * 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            </ResultCard>
          )}
        </Stack>
      )}

      {/* keep last request reference for type-checker */}
      {!lastRequest && null}
    </Box>
  );
}
