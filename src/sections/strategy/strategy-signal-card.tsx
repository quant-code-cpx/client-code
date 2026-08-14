import type { PortfolioListItem } from 'src/api/portfolio';
import type { SignalActivationItem, LatestSignalResponse } from 'src/api/signal';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { fmtTradeDate } from 'src/utils/format-time';

import { listPortfolios } from 'src/api/portfolio';
import {
  activateSignal,
  deactivateSignal,
  getLatestSignals,
  listSignalActivations,
} from 'src/api/signal';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  strategyId: string;
  strategyName: string;
};

function normalizeSignalUniverse(universe: string) {
  if (universe === 'ZZ500') return 'CSI500';
  if (universe === 'ZZ1000') return 'CSI1000';
  return universe;
}

export function StrategySignalCard({ strategyId, strategyName }: Props) {
  const router = useRouter();

  const [activation, setActivation] = useState<SignalActivationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activationError, setActivationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  // 今日信号摘要
  const [latestSignal, setLatestSignal] = useState<LatestSignalResponse | null>(null);

  // Form state
  const [portfolioId, setPortfolioId] = useState('');
  const [universe, setUniverse] = useState('ALL_A');
  const [benchmarkTsCode, setBenchmarkTsCode] = useState('000300.SH');
  const [alertThreshold, setAlertThreshold] = useState(0.3);

  // Portfolio list for dropdown
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [portfoliosError, setPortfoliosError] = useState('');

  const fetchActivation = useCallback(async () => {
    setLoading(true);
    setActivationError('');
    try {
      const list = await listSignalActivations();
      const found = list.find((a) => a.strategyId === strategyId);
      setActivation(found ?? null);
      if (found) {
        setPortfolioId(found.portfolioId ?? '');
        setUniverse(normalizeSignalUniverse(found.universe));
        setBenchmarkTsCode(found.benchmarkTsCode);
        setAlertThreshold(found.alertThreshold);
      }
    } catch (err) {
      setActivationError(err instanceof Error ? err.message : '加载信号配置失败');
    } finally {
      setLoading(false);
    }
  }, [strategyId]);

  const fetchPortfolios = useCallback(async () => {
    setPortfoliosError('');
    try {
      setPortfolios(await listPortfolios());
    } catch (err) {
      setPortfoliosError(err instanceof Error ? err.message : '加载组合列表失败');
    }
  }, []);

  useEffect(() => {
    fetchActivation();
  }, [fetchActivation]);

  // 激活后加载今日信号摘要
  useEffect(() => {
    if (activation?.isActive) {
      getLatestSignals({ strategyId })
        .then((list) => {
          const found = list.find((s) => s.strategyId === strategyId) ?? list[0] ?? null;
          setLatestSignal(found);
        })
        .catch(() => {});
    } else {
      setLatestSignal(null);
    }
  }, [activation, strategyId]);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const handleActivate = async () => {
    setSubmitting(true);
    try {
      const result = await activateSignal({
        strategyId,
        ...(portfolioId ? { portfolioId } : {}),
        universe,
        benchmarkTsCode,
        alertThreshold,
      });
      setActivation(result);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setSubmitting(true);
    try {
      const result = await deactivateSignal({ strategyId });
      setActivation(result);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="信号生成" />
        <Box sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            加载中…
          </Typography>
        </Box>
      </Card>
    );
  }

  if (activationError) {
    return (
      <Card>
        <CardHeader title="信号生成" />
        <Box sx={{ p: 3 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={fetchActivation}>
                重试
              </Button>
            }
          >
            {activationError}
          </Alert>
        </Box>
      </Card>
    );
  }

  const isActive = activation?.isActive;
  const showForm = !isActive || editing;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return fmtTradeDate(dateStr);
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Iconify icon="solar:pulse-2-bold-duotone" width={20} />
            信号生成
            {isActive && (
              <Label color="success" variant="soft">
                已激活
              </Label>
            )}
          </Box>
        }
        action={
          isActive && !editing ? (
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setEditing(true)}>
                编辑
              </Button>
              <Button size="small" color="error" onClick={handleDeactivate} disabled={submitting}>
                停用
              </Button>
            </Stack>
          ) : undefined
        }
      />

      <Box sx={{ p: 3 }}>
        {portfoliosError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={fetchPortfolios}>
                重试
              </Button>
            }
            sx={{ mb: 2 }}
          >
            {portfoliosError}
          </Alert>
        )}
        {/* 今日信号摘要（仅激活状态下显示） */}
        {isActive && latestSignal && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                最新信号日期：{fmtTradeDate(latestSignal.tradeDate)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(() => {
                  const buyCount = latestSignal.signals.filter((s) => s.action === 'BUY').length;
                  const sellCount = latestSignal.signals.filter((s) => s.action === 'SELL').length;
                  const holdCount = latestSignal.signals.filter((s) => s.action === 'HOLD').length;
                  return (
                    <>
                      {buyCount > 0 && (
                        <Chip
                          size="small"
                          label={`买入 ${buyCount}`}
                          sx={(theme) => ({
                            bgcolor: theme.palette.error.light,
                            color: theme.palette.error.dark,
                          })}
                        />
                      )}
                      {sellCount > 0 && (
                        <Chip
                          size="small"
                          label={`卖出 ${sellCount}`}
                          sx={(theme) => ({
                            bgcolor: theme.palette.success.light,
                            color: theme.palette.success.dark,
                          })}
                        />
                      )}
                      {holdCount > 0 && (
                        <Chip size="small" label={`持有 ${holdCount}`} variant="outlined" />
                      )}
                      {latestSignal.signals.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          当日无信号
                        </Typography>
                      )}
                    </>
                  );
                })()}
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {showForm ? (
          <Stack spacing={2}>
            {!isActive && (
              <Typography variant="body2" color="text.secondary">
                当前策略未激活每日信号生成
              </Typography>
            )}

            <TextField
              select
              size="small"
              label="关联组合"
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">不关联</MenuItem>
              {portfolios.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="信号宇宙"
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              fullWidth
            >
              <MenuItem value="ALL_A">ALL_A（全 A）</MenuItem>
              <MenuItem value="HS300">HS300（沪深 300）</MenuItem>
              <MenuItem value="CSI500">CSI500（中证 500）</MenuItem>
              <MenuItem value="CSI1000">CSI1000（中证 1000）</MenuItem>
            </TextField>

            <TextField
              size="small"
              label="基准指数"
              value={benchmarkTsCode}
              onChange={(e) => setBenchmarkTsCode(e.target.value)}
              fullWidth
            />

            <Box>
              <Typography variant="caption" color="text.secondary">
                漂移阈值：{alertThreshold.toFixed(2)}
              </Typography>
              <Slider
                size="small"
                min={0.05}
                max={1}
                step={0.05}
                value={alertThreshold}
                onChange={(_, v) => setAlertThreshold(v as number)}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              {editing && (
                <Button size="small" onClick={() => setEditing(false)}>
                  取消
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                onClick={handleActivate}
                disabled={submitting}
              >
                {isActive ? '保存' : '激活信号生成'}
              </Button>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <InfoRow label="信号宇宙" value={activation!.universe} />
            <InfoRow label="基准指数" value={activation!.benchmarkTsCode} />
            <InfoRow
              label="关联组合"
              value={
                activation!.portfolioId
                  ? (portfolios.find((p) => p.id === activation!.portfolioId)?.name ??
                    `${activation!.portfolioId.slice(0, 8)}...`)
                  : '无'
              }
            />
            <InfoRow label="漂移阈值" value={activation!.alertThreshold.toFixed(2)} />
            <InfoRow label="回看天数" value={String(activation!.lookbackDays)} />
            <InfoRow label="最近信号" value={formatDate(activation!.lastSignalDate)} />

            <Button
              size="small"
              variant="outlined"
              endIcon={<Iconify icon="solar:arrow-right-bold" />}
              onClick={() => router.push(`/signal?strategyId=${strategyId}`)}
              sx={{ mt: 1, alignSelf: 'flex-start' }}
            >
              查看最新信号
            </Button>
          </Stack>
        )}
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
