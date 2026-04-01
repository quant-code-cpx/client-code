import type { ValidateBacktestRunResponse } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';

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

// ----------------------------------------------------------------------

interface BacktestValidatePanelProps {
  validation: ValidateBacktestRunResponse | null;
  loading: boolean;
}

export function BacktestValidatePanel({ validation, loading }: BacktestValidatePanelProps) {
  if (loading) {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Skeleton width={120} height={24} sx={{ mb: 1 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={28} />
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
            <Typography variant="body2">点击&quot;校验配置&quot;后查看数据完备性报告</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { isValid, dataReadiness, stats, warnings, errors } = validation;

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Iconify
            icon={isValid ? 'solar:shield-check-bold' : 'solar:shield-warning-bold'}
            width={20}
            sx={{ color: isValid ? 'success.main' : 'error.main' }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            数据完备性
          </Typography>
          <Label color={isValid ? 'success' : 'error'} variant="soft">
            {isValid ? '通过' : '有问题'}
          </Label>
        </Box>

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
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              预计交易日数
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {stats.tradingDays} 天
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              预计股票池规模
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {stats.estimatedUniverseSize != null ? `${stats.estimatedUniverseSize} 只` : '-'}
            </Typography>
          </Box>
          {stats.earliestAvailableDate && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                最早可用数据
              </Typography>
              <Typography variant="body2">{stats.earliestAvailableDate}</Typography>
            </Box>
          )}
          {stats.latestAvailableDate && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                最新可用数据
              </Typography>
              <Typography variant="body2">{stats.latestAvailableDate}</Typography>
            </Box>
          )}
        </Box>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              错误（必须修复才能提交）
            </Typography>
            {errors.map((e, i) => (
              <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                • {e}
              </Typography>
            ))}
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              警告（可继续提交，但结果可能失真）
            </Typography>
            {warnings.map((w, i) => (
              <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                • {w}
              </Typography>
            ))}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
