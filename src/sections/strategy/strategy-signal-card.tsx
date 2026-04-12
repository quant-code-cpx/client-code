import type { SignalActivationItem } from 'src/api/signal';
import type { PortfolioListItem } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { listPortfolios } from 'src/api/portfolio';
import { activateSignal, deactivateSignal, listSignalActivations } from 'src/api/signal';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  strategyId: string;
  strategyName: string;
};

export function StrategySignalCard({ strategyId, strategyName }: Props) {
  const router = useRouter();

  const [activation, setActivation] = useState<SignalActivationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form state
  const [portfolioId, setPortfolioId] = useState('');
  const [universe, setUniverse] = useState('ALL_A');
  const [benchmarkTsCode, setBenchmarkTsCode] = useState('000300.SH');
  const [alertThreshold, setAlertThreshold] = useState(0.3);

  // Portfolio list for dropdown
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);

  const fetchActivation = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSignalActivations();
      const found = list.find((a) => a.strategyId === strategyId);
      setActivation(found ?? null);
      if (found) {
        setPortfolioId(found.portfolioId ?? '');
        setUniverse(found.universe);
        setBenchmarkTsCode(found.benchmarkTsCode);
        setAlertThreshold(found.alertThreshold);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [strategyId]);

  useEffect(() => {
    fetchActivation();
  }, [fetchActivation]);

  useEffect(() => {
    listPortfolios()
      .then(setPortfolios)
      .catch(() => {});
  }, []);

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

  const isActive = activation?.isActive;
  const showForm = !isActive || editing;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr.slice(0, 10);
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
              <MenuItem value="ZZ500">ZZ500（中证 500）</MenuItem>
              <MenuItem value="ZZ1000">ZZ1000（中证 1000）</MenuItem>
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
