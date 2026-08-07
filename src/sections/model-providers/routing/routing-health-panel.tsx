import type { ModelDeployment, ModelRoutingSummary } from 'src/api/model-provider';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

export function hasModelRoutingConfigurationIssue(
  summary: ModelRoutingSummary,
  candidateCount: number
) {
  return candidateCount === 0 || summary.verifiedConnections === 0 || summary.configurationIssues > 0;
}

export function RoutingHealthPanel({
  deployments,
  summary,
}: {
  deployments: ModelDeployment[];
  summary: ModelRoutingSummary;
}) {
  const candidates = deployments.filter((item) => item.enabled).sort((a, b) => a.priority - b.priority);
  const hasConfigurationIssue = hasModelRoutingConfigurationIssue(summary, candidates.length);
  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              活动配置版本
            </Typography>
            <Typography variant="body2" color="text.secondary">
              启用或停用部署时，系统会校验候选并自动生成活动版本；Registry 在所有适配器构造成功后原子替换。
            </Typography>
          </Box>
          <Chip
            icon={<Iconify icon="solar:shuffle-bold" width={18} />}
            label={summary.activeVersion ?? '尚未发布版本'}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {candidates.length === 0 ? (
        <Alert severity="warning">没有已启用部署。请先完成连接测试与模型深度探测，再启用部署。</Alert>
      ) : null}
      {candidates.length > 0 && hasConfigurationIssue ? (
        <Alert severity="warning">
          当前候选仍有未验证连接或配置异常。完成连接测试与模型深度探测后才能启用部署。
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1.5 }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            路由候选顺序
          </Typography>
          <Typography variant="body2" color="text.secondary">
            当前预览按优先级升序排列；实际请求还会按能力、数据边界和健康状态排除候选。
          </Typography>
        </Box>
        <Divider />
        <Stack divider={<Divider flexItem />}>
          {candidates.map((item, index) => (
            <Stack key={item.id} direction="row" spacing={2} alignItems="center" sx={{ px: 2.5, py: 1.75 }}>
              <Box
                sx={(theme) => ({
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  color: 'primary.main',
                  bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                })}
              >
                {index + 1}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {item.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.modelId} · {item.connectionName}
                </Typography>
              </Box>
              <Chip size="small" label={`优先级 ${item.priority}`} />
              <Chip
                size="small"
                variant="outlined"
                color={item.lastProbe?.status === 'PASSED' ? 'success' : 'warning'}
                label={item.lastProbe?.status === 'PASSED' ? '已验证' : '验证状态异常'}
              />
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
