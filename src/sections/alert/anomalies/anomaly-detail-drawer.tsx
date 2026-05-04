import type {
  MarketAnomaly,
  AnomalyDetailResponse,
  AnomalyVolumeSurgeDetail,
  AnomalyLargeNetInflowDetail,
  AnomalyConsecutiveLimitUpDetail,
} from 'src/api/alert';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { alertApi } from 'src/api/alert';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import {
  fmtTradeDate,
  getSeverityMeta,
  fallbackSeverity,
  formatAnomalyValue,
  getAnomalyTypeConfig,
  formatAnomalyThreshold,
} from './anomaly-type-config';

// ----------------------------------------------------------------------

const PLACEHOLDER = '--';

function fmtNumber(value: number | null | undefined, suffix = '', digits = 2): string {
  if (value == null || !Number.isFinite(value)) return PLACEHOLDER;
  return `${value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
}

/** 万手 — vol 单位为"手"时除以 10000 */
function fmtVolWanShou(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return PLACEHOLDER;
  return `${(value / 10000).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} 万手`;
}

/** 万元 → 亿元 */
function fmtAmountYi(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return PLACEHOLDER;
  return `${(value / 10000).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} 亿元`;
}

// ----------------------------------------------------------------------

function MetricRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {hint ? (
          <Tooltip title={hint} placement="top">
            <Box component="span" sx={{ color: 'text.disabled', fontSize: 12, cursor: 'help' }}>
              ⓘ
            </Box>
          </Tooltip>
        ) : null}
      </Stack>
      <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Stack>
  );
}

function VolumeSurgeMetrics({ anomaly }: { anomaly: MarketAnomaly }) {
  const d = (anomaly.detail ?? {}) as AnomalyVolumeSurgeDetail;
  return (
    <Stack>
      <MetricRow label="当日成交量" value={fmtVolWanShou(d.vol)} hint="字段：daily.vol，单位为手" />
      <MetricRow
        label="近 20 日均量"
        value={fmtVolWanShou(d.avg20Vol)}
        hint="近 20 个交易日 daily.vol 均值，剔除最新交易日"
      />
      <MetricRow
        label="放量倍数"
        value={formatAnomalyValue(anomaly.anomalyType, anomaly.value)}
        hint="= 当日成交量 / 近 20 日均量"
      />
      <MetricRow
        label="阈值"
        value={formatAnomalyThreshold(anomaly.anomalyType, anomaly.threshold)}
      />
    </Stack>
  );
}

function ConsecutiveLimitUpMetrics({ anomaly }: { anomaly: MarketAnomaly }) {
  const d = (anomaly.detail ?? {}) as AnomalyConsecutiveLimitUpDetail;
  return (
    <Stack>
      <MetricRow
        label="连续涨停天数"
        value={fmtNumber(d.consecutiveDays ?? anomaly.value, ' 天', 0)}
        hint="收盘价 ≥ 涨停价（来自 stk_limit）连续天数"
      />
      <MetricRow
        label="阈值"
        value={formatAnomalyThreshold(anomaly.anomalyType, anomaly.threshold)}
      />
    </Stack>
  );
}

function LargeNetInflowMetrics({ anomaly }: { anomaly: MarketAnomaly }) {
  const d = (anomaly.detail ?? {}) as AnomalyLargeNetInflowDetail;
  return (
    <Stack>
      <MetricRow
        label="超大单买入"
        value={fmtAmountYi(d.buyElgAmount)}
        hint="字段：moneyflow.buy_elg_amount，单位万元"
      />
      <MetricRow
        label="超大单卖出"
        value={fmtAmountYi(d.sellElgAmount)}
        hint="字段：moneyflow.sell_elg_amount"
      />
      <MetricRow label="超大单净流入" value={fmtAmountYi(d.netElg)} hint="买入 − 卖出" />
      <MetricRow label="当日成交额" value={fmtAmountYi(d.amount)} hint="字段：daily.amount" />
      <MetricRow
        label="净流入占比"
        value={formatAnomalyValue(anomaly.anomalyType, anomaly.value)}
        hint="= 超大单净流入 / 当日成交额"
      />
      <MetricRow
        label="阈值"
        value={formatAnomalyThreshold(anomaly.anomalyType, anomaly.threshold)}
      />
    </Stack>
  );
}

function MetricsBlock({ anomaly }: { anomaly: MarketAnomaly }) {
  switch (anomaly.anomalyType) {
    case 'VOLUME_SURGE':
      return <VolumeSurgeMetrics anomaly={anomaly} />;
    case 'CONSECUTIVE_LIMIT_UP':
      return <ConsecutiveLimitUpMetrics anomaly={anomaly} />;
    case 'LARGE_NET_INFLOW':
      return <LargeNetInflowMetrics anomaly={anomaly} />;
    default:
      return (
        <Typography variant="body2" color="text.disabled">
          暂无证据链
        </Typography>
      );
  }
}

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  anomaly: MarketAnomaly | null;
  onClose: () => void;
  onAddToWatchlist: (tsCode: string) => void;
};

export function AnomalyDetailDrawer({ open, anomaly, onClose, onAddToWatchlist }: Props) {
  const theme = useTheme();
  const [detail, setDetail] = useState<AnomalyDetailResponse | null>(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!open || !anomaly) return undefined;
    const controller = new AbortController();
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    alertApi
      .getAnomalyDetail({ id: anomaly.id }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setDetail(res);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // 后端 detail 端点未上线时静默降级，仅展示行内字段
        setDetailError(err instanceof Error ? err.message : '完整证据链加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [open, anomaly]);

  if (!anomaly) return null;

  const cfg = getAnomalyTypeConfig(anomaly.anomalyType);
  const severity =
    anomaly.severity ?? fallbackSeverity(anomaly.anomalyType, anomaly.value, anomaly.threshold);
  const sevMeta = getSeverityMeta(severity);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 } } } }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Iconify icon={cfg.icon} width={22} sx={{ color: `${cfg.color}.main` }} />
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>
              {anomaly.stockName ?? '--'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {anomaly.tsCode}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
            <Label color={sevMeta.color === 'default' ? 'default' : sevMeta.color} variant="soft">
              强度 {sevMeta.label}
            </Label>
            <Label color={cfg.color} variant="soft">
              {cfg.label}
            </Label>
            <Typography variant="caption" color="text.secondary">
              {fmtTradeDate(anomaly.tradeDate)}
            </Typography>
          </Stack>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <Iconify icon="solar:close-circle-bold" width={20} />
        </IconButton>
      </Stack>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              判定规则
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {detail?.ruleDescription ?? cfg.ruleDesc}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" color="text.secondary">
              证据链
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <MetricsBlock anomaly={anomaly} />
            </Box>
            {detailError && (
              <Alert severity="info" variant="outlined" sx={{ mt: 1, fontSize: 12 }}>
                完整证据链待后端 detail 端点上线，已基于行内字段降级展示。
              </Alert>
            )}
            {detailLoading && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  加载完整证据链...
                </Typography>
              </Stack>
            )}
          </Box>

          {detail?.relatedAnomalies && detail.relatedAnomalies.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">
                  同股同日共振
                </Typography>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {detail.relatedAnomalies.map((rel) => {
                    const relCfg = getAnomalyTypeConfig(rel.anomalyType);
                    return (
                      <Stack
                        key={rel.id}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ fontSize: 13 }}
                      >
                        <Label color={relCfg.color} variant="soft">
                          {relCfg.label}
                        </Label>
                        <Typography variant="body2" color="text.secondary">
                          {formatAnomalyValue(rel.anomalyType, rel.value)} / 阈值
                          {formatAnomalyThreshold(rel.anomalyType, rel.threshold)}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            </>
          )}

          {detail?.history && detail.history.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="overline" color="text.secondary">
                  近期同股异动轨迹
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {detail.history.slice(0, 10).map((h, idx) => {
                    const hCfg = getAnomalyTypeConfig(h.anomalyType);
                    return (
                      <Stack
                        key={`${h.tradeDate}-${h.anomalyType}-${idx}`}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ width: 92, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {fmtTradeDate(h.tradeDate)}
                        </Typography>
                        <Label color={hCfg.color} variant="outlined">
                          {hCfg.shortLabel}
                        </Label>
                        <Typography
                          variant="caption"
                          color="text.primary"
                          sx={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatAnomalyValue(h.anomalyType, h.value)}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            </>
          )}

          <Divider />
          <Box>
            <Typography variant="overline" color="text.secondary">
              数据来源
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {(detail?.sourceTables ?? ['daily', 'moneyflow', 'stk_limit']).join('、')} · 扫描时间{' '}
              {anomaly.scannedAt ? fDateTime(anomaly.scannedAt) : PLACEHOLDER}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Footer */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.vars.palette.divider}`,
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
        }}
      >
        <Button
          variant="contained"
          fullWidth
          startIcon={<Iconify icon="solar:share-bold" width={16} />}
          component={RouterLink}
          href={`/stock/detail?code=${encodeURIComponent(anomaly.tsCode)}`}
        >
          打开个股详情
        </Button>
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:cart-3-bold" width={16} />}
          onClick={() => onAddToWatchlist(anomaly.tsCode)}
        >
          加入自选
        </Button>
      </Stack>
    </Drawer>
  );
}
