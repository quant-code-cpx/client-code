import type { ModelRoutingSummary } from 'src/api/model-provider';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

const STATUS_ITEMS = [
  { key: 'activeDeployments', label: '活动部署', note: '当前进入路由', icon: 'solar:layers-bold', color: 'primary' },
  { key: 'verifiedConnections', label: '已验证连接', note: '最近连接测试通过', icon: 'solar:shield-check-bold', color: 'success' },
  { key: 'failedProbes', label: '测试失败', note: '需要检查连接或模型', icon: 'solar:danger-triangle-bold', color: 'error' },
  { key: 'configurationIssues', label: '配置异常', note: '启用状态与验证不一致', icon: 'solar:settings-bold-duotone', color: 'warning' },
] as const;

export function ProviderStatusStrip({
  summary,
  loading,
}: {
  summary: ModelRoutingSummary;
  loading: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' },
        gap: 2,
      }}
    >
      {STATUS_ITEMS.map((item) => (
        <Paper
          key={item.key}
          variant="outlined"
          sx={(theme) => ({
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderRadius: 1.5,
            bgcolor: varAlpha(theme.vars.palette[item.color].mainChannel, 0.04),
          })}
        >
          <Box
            sx={(theme) => ({
              width: 40,
              height: 40,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1,
              color: `${item.color}.main`,
              bgcolor: varAlpha(theme.vars.palette[item.color].mainChannel, 0.12),
            })}
          >
            <Iconify icon={item.icon} width={22} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            {loading ? (
              <Skeleton width={44} height={34} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {summary[item.key]}
              </Typography>
            )}
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.note}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
