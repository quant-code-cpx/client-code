import type { ValidateBacktestRunResponse } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';

import { fToNow } from 'src/utils/format-time';
import { fNumber, fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const DATA_ITEMS: Array<{
  key: keyof ValidateBacktestRunResponse['dataReadiness'];
  label: string;
}> = [
  { key: 'hasDaily', label: 'daily（日行情）' },
  { key: 'hasAdjFactor', label: 'adj_factor（复权因子）' },
  { key: 'hasTradeCal', label: 'trade_cal（交易日历）' },
  { key: 'hasIndexDaily', label: 'index_daily（指数行情）' },
  { key: 'hasStkLimit', label: 'stk_limit（涨跌停）' },
  { key: 'hasSuspendD', label: 'suspend_d（停牌数据）' },
  { key: 'hasIndexWeight', label: 'index_weight（指数权重）' },
];

interface BacktestValidatePanelProps {
  validation: ValidateBacktestRunResponse | null;
  loading: boolean;
  stale?: boolean;
  onOpenRun?: (runId: string) => void;
}

function formatRuntime(seconds: number | undefined) {
  if (seconds == null) return '-';
  if (seconds < 60) return `~${Math.max(1, Math.round(seconds))}s`;
  return `~${Math.round(seconds / 60)}min`;
}

function formatMaybeRatioPercent(value: number) {
  return fPercent(Math.abs(value) <= 1 ? value * 100 : value);
}

function MetricBlock({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <Box
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        minWidth: 0,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {unit ? (
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
            {unit}
          </Typography>
        ) : null}
      </Typography>
    </Box>
  );
}

export function BacktestValidatePanel({
  validation,
  loading,
  stale = false,
  onOpenRun,
}: BacktestValidatePanelProps) {
  if (loading && !validation) {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Skeleton width={120} height={24} sx={{ mb: 1 }} />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} width="100%" height={28} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!validation) {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 3,
              gap: 1,
              color: 'text.secondary',
            }}
          >
            <Iconify icon="solar:shield-check-bold" width={36} />
            <Typography variant="body2">系统将在配置变更后自动校验数据完备性</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { isValid, dataReadiness, stats, warnings, errors, fieldErrors } = validation;
  const hasWarnings = warnings.length > 0;
  const statusColor =
    stale || loading ? 'info' : isValid ? (hasWarnings ? 'warning' : 'success') : 'error';
  const statusText =
    stale || loading ? '正在重新校验' : isValid ? (hasWarnings ? '有警告' : '已通过') : '有错误';
  const hasEstimation =
    validation.estimatedRebalanceCount != null ||
    validation.estimatedTradeCount != null ||
    validation.estimatedRuntimeSeconds != null ||
    validation.dataGapPercentage != null;

  return (
    <Card>
      {loading ? <LinearProgress /> : null}
      <CardContent sx={{ p: 3, opacity: stale ? 0.72 : 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Iconify
            icon={isValid ? 'solar:shield-check-bold' : 'solar:shield-warning-bold'}
            width={20}
            sx={{ color: `${statusColor}.main` }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            校验状态
          </Typography>
          <Label color={statusColor} variant="filled">
            {statusText}
          </Label>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          数据完备性
        </Typography>
        <List dense disablePadding>
          {DATA_ITEMS.map(({ key, label }) => {
            const ready = dataReadiness[key];
            return (
              <ListItem key={key} disablePadding sx={{ py: 0.25 }}>
                <Iconify
                  icon={ready ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
                  width={16}
                  sx={{ color: ready ? 'success.main' : 'error.main', mr: 1, flexShrink: 0 }}
                />
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    variant: 'caption',
                    color: ready ? 'text.primary' : 'error.main',
                  }}
                />
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          统计信息
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <MetricBlock label="交易日" value={fNumber(stats.tradingDays)} unit="天" />
          <MetricBlock
            label="股票池规模"
            value={stats.estimatedUniverseSize != null ? fNumber(stats.estimatedUniverseSize) : '-'}
            unit={stats.estimatedUniverseSize != null ? '只' : undefined}
          />
          {stats.earliestAvailableDate ? (
            <MetricBlock label="最早可用" value={stats.earliestAvailableDate} />
          ) : null}
          {stats.latestAvailableDate ? (
            <MetricBlock label="最新可用" value={stats.latestAvailableDate} />
          ) : null}
        </Box>

        {hasEstimation ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              提交前估算
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <MetricBlock
                label="调仓次数"
                value={
                  validation.estimatedRebalanceCount != null
                    ? fNumber(validation.estimatedRebalanceCount)
                    : '-'
                }
                unit={validation.estimatedRebalanceCount != null ? '次' : undefined}
              />
              <MetricBlock
                label="交易笔数"
                value={
                  validation.estimatedTradeCount != null
                    ? fNumber(validation.estimatedTradeCount)
                    : '-'
                }
                unit={validation.estimatedTradeCount != null ? '笔' : undefined}
              />
              <MetricBlock
                label="运行时长"
                value={formatRuntime(validation.estimatedRuntimeSeconds)}
              />
              <MetricBlock
                label="数据缺口"
                value={
                  validation.dataGapPercentage != null
                    ? formatMaybeRatioPercent(validation.dataGapPercentage)
                    : '-'
                }
              />
            </Box>
          </>
        ) : null}

        {validation.similarCompletedRuns?.length ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              相似配置
            </Typography>
            <List dense disablePadding>
              {validation.similarCompletedRuns.slice(0, 3).map((run) => (
                <ListItem
                  key={run.runId}
                  disableGutters
                  secondaryAction={
                    <Button size="small" onClick={() => onOpenRun?.(run.runId)}>
                      查看
                    </Button>
                  }
                  sx={{ pr: 7 }}
                >
                  <ListItemText
                    primary={run.name ?? run.runId}
                    secondary={`创建于 ${fToNow(run.createdAt)} · 收益 ${
                      run.totalReturn != null ? formatMaybeRatioPercent(run.totalReturn) : '-'
                    }`}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : null}

        {fieldErrors?.length ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              字段级错误
            </Typography>
            {fieldErrors.map((error) => (
              <Typography
                key={`${error.path}-${error.message}`}
                variant="caption"
                sx={{ display: 'block' }}
              >
                • {error.path}：{error.message}
              </Typography>
            ))}
          </Alert>
        ) : null}

        {errors.length > 0 ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              错误（必须修复才能提交）
            </Typography>
            {errors.map((error) => (
              <Typography key={error} variant="caption" sx={{ display: 'block' }}>
                • {error}
              </Typography>
            ))}
          </Alert>
        ) : null}

        {warnings.length > 0 ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              警告（可继续提交，但结果可能失真）
            </Typography>
            {warnings.map((warning) => (
              <Typography key={warning} variant="caption" sx={{ display: 'block' }}>
                • {warning}
              </Typography>
            ))}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
