import type { TradingSignalItem } from 'src/api/signal';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { useRouter } from 'src/routes/hooks';

import { alertApi } from 'src/api/alert';
import { getLatestSignals, listSignalActivations } from 'src/api/signal';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  BUY: { label: '买入', color: 'error.main', icon: 'solar:alt-arrow-up-bold' },
  SELL: { label: '卖出', color: 'success.main', icon: 'solar:alt-arrow-down-bold' },
  HOLD: { label: '持有', color: 'text.secondary', icon: 'solar:pause-bold' },
};

// ----------------------------------------------------------------------

type DashboardSignalCenterProps = { refreshKey?: number };

export function DashboardSignalCenter({ refreshKey }: DashboardSignalCenterProps) {
  const theme = useTheme();
  const router = useRouter();

  const [activeCount, setActiveCount] = useState(0);
  const [signals, setSignals] = useState<(TradingSignalItem & { strategyName: string })[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([listSignalActivations(), getLatestSignals({}), alertApi.getPriceRules()])
      .then(([activationsResult, latestResult, rulesResult]) => {
        const activations = activationsResult.status === 'fulfilled' ? activationsResult.value : [];
        const latestRes = latestResult.status === 'fulfilled' ? latestResult.value : [];
        const rules = rulesResult.status === 'fulfilled' ? rulesResult.value : [];

        // Count active strategy activations
        const active = (activations ?? []).filter((a) => a.isActive);
        setActiveCount(active.length);

        // Flatten signals from all strategies, take top 5
        const allSignals: (TradingSignalItem & { strategyName: string })[] = [];
        (latestRes ?? []).forEach((group) => {
          (group.signals ?? []).forEach((sig) => {
            if (sig.action !== 'HOLD') {
              allSignals.push({ ...sig, strategyName: group.strategyName });
            }
          });
        });
        setSignals(allSignals.slice(0, 5));

        // Active alert rules count
        const activeRules = (rules ?? []).filter((r) => r.status === 'ACTIVE');
        setAlertCount(activeRules.length);
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return <Skeleton variant="rounded" height={260} />;
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="信号中心"
        slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }}
        avatar={<Iconify icon="solar:graph-up-bold" width={22} sx={{ color: 'secondary.main' }} />}
        sx={{ pb: 1 }}
      />

      <Box sx={{ px: 3, pb: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Status badges row */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <Box
            sx={{
              flex: 1,
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
              {activeCount}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
              活跃策略
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.08),
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.main' }}>
              {alertCount}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
              价格预警
            </Typography>
          </Box>
        </Stack>

        {/* Latest signals */}
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', fontWeight: 600, mb: 1, display: 'block' }}
        >
          最新交易信号
        </Typography>

        {signals.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
            }}
          >
            <Iconify icon="solar:plug-circle-bold" width={32} sx={{ mb: 0.5, opacity: 0.5 }} />
            <Typography variant="caption" display="block">
              暂无活跃信号
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.5} sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {signals.map((sig, idx) => {
              const cfg = ACTION_CONFIG[sig.action] || ACTION_CONFIG.HOLD;
              return (
                <Stack
                  key={`${sig.tsCode}-${idx}`}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    transition: 'background-color 0.15s',
                    '&:hover': {
                      bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.04),
                    },
                  }}
                >
                  <Iconify icon={cfg.icon as any} width={14} sx={{ color: cfg.color }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                    {sig.stockName}
                  </Typography>
                  <Chip
                    label={cfg.label}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 12,
                      fontWeight: 700,
                      color: cfg.color,
                      bgcolor: 'transparent',
                      border: '1px solid',
                      borderColor: cfg.color,
                    }}
                  />
                  {sig.confidence != null && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled', ml: 'auto', fontSize: 12 }}
                    >
                      {(sig.confidence * 100).toFixed(0)}%
                    </Typography>
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}

        {/* View more link */}
        <Box sx={{ mt: 1.5, textAlign: 'center' }}>
          <Button size="small" variant="text" onClick={() => router.push('/strategy/signal')}>
            查看全部信号 →
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
