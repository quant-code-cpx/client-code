import type { ModelDeployment } from 'src/api/model-provider';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';

import { ADAPTER_LABELS, REASONING_MODE_LABELS } from '../model-provider.constants';

export function DeploymentTable({
  items,
  loading,
  busyId,
  onCreate,
  onEdit,
  onProbe,
  onToggle,
  onDelete,
}: {
  items: ModelDeployment[];
  loading: boolean;
  busyId: string | null;
  onCreate: () => void;
  onEdit: (deployment: ModelDeployment) => void;
  onProbe: (deployment: ModelDeployment) => void;
  onToggle: (deployment: ModelDeployment) => void;
  onDelete: (deployment: ModelDeployment) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1.5 }}>
      <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            模型部署
          </Typography>
          <Typography variant="body2" color="text.secondary">
            同名模型可部署在不同连接；Agent 路由使用稳定 deployment ID
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Iconify icon="mingcute:add-line" />} onClick={onCreate}>
          新建部署
        </Button>
      </Box>
      <TableContainer>
        <Table sx={{ minWidth: 1120 }}>
          <TableHead>
            <TableRow>
              {['模型', '连接与协议', '推理策略', '能力证据', '优先级', '探测', '启用', '操作'].map((label) => (
                <TableCell key={label}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`deployment-skeleton-${index}`}>
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Box sx={{ py: 7, textAlign: 'center' }}>
                    <Iconify icon="solar:bolt-bold" width={44} color="text.disabled" />
                    <Typography sx={{ mt: 1, fontWeight: 700 }}>还没有模型部署</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      创建连接后，为其配置真实模型 ID、能力和推理策略。
                    </Typography>
                    <Button variant="outlined" onClick={onCreate}>
                      创建模型部署
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}
            {!loading
              ? items.map((item) => (
                  <TableRow key={item.id} hover sx={{ opacity: item.enabled ? 1 : 0.72 }}>
                    <TableCell sx={{ minWidth: 190 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {item.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.modelId}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 210 }}>
                      <Typography variant="body2">{item.connectionName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ADAPTER_LABELS[item.adapterKind]}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 155 }}>
                      <Typography variant="body2">{REASONING_MODE_LABELS[item.reasoningMode]}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.defaultReasoningEffort?.toLowerCase() ??
                          (item.reasoningBudgetTokens ? `${item.reasoningBudgetTokens} tokens` : '模型默认')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 240 }}>
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {item.capabilities.slice(0, 3).map((capability) => (
                          <Chip
                            key={capability}
                            label={capability.replace(/_/g, ' ')}
                            size="small"
                            variant="outlined"
                            color={item.lastProbe?.status === 'PASSED' ? 'success' : 'default'}
                          />
                        ))}
                        {item.capabilities.length > 3 ? (
                          <Chip label={`+${item.capabilities.length - 3}`} size="small" variant="outlined" />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.priority} size="small" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={item.lastProbe?.status === 'PASSED' ? 'success' : item.lastProbe?.status === 'FAILED' ? 'error' : 'default'}
                        label={item.lastProbe?.status === 'PASSED' ? '已验证' : item.lastProbe?.status === 'FAILED' ? '失败' : '未探测'}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.enabled}
                        disabled={busyId === item.id}
                        onChange={() => onToggle(item)}
                        slotProps={{ input: { 'aria-label': `${item.displayName} 启用状态` } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end">
                        <Tooltip title="深度探测（可能计费）">
                          <IconButton aria-label={`探测 ${item.displayName}`} onClick={() => onProbe(item)}>
                            <Iconify icon="solar:test-tube-bold" width={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="编辑">
                          <IconButton aria-label={`编辑 ${item.displayName}`} onClick={() => onEdit(item)}>
                            <Iconify icon="solar:pen-bold" width={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton color="error" aria-label={`删除 ${item.displayName}`} onClick={() => onDelete(item)}>
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
