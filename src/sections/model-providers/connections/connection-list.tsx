import type { ModelConnection } from 'src/api/model-provider';

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

import { ADAPTER_LABELS } from '../model-provider.constants';

export function ConnectionList({
  items,
  loading,
  busyId,
  onCreate,
  onEdit,
  onTest,
  onToggle,
  onDelete,
}: {
  items: ModelConnection[];
  loading: boolean;
  busyId: string | null;
  onCreate: () => void;
  onEdit: (connection: ModelConnection) => void;
  onTest: (connection: ModelConnection) => void;
  onToggle: (connection: ModelConnection) => void;
  onDelete: (connection: ModelConnection) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1.5 }}>
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            供应商接入点
          </Typography>
          <Typography variant="body2" color="text.secondary">
            每个连接只保存一次 Base URL 与凭证，可承载多个模型部署
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Iconify icon="mingcute:add-line" />} onClick={onCreate}>
          接入供应商
        </Button>
      </Box>
      <TableContainer>
        <Table sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              {['连接', '协议', 'Base URL', '模型数', '最近测试', '凭证', '启用', '操作'].map((label) => (
                <TableCell key={label}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`connection-skeleton-${index}`}>
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
                    <Iconify icon="solar:square-linear" width={44} color="text.disabled" />
                    <Typography sx={{ mt: 1, fontWeight: 700 }}>尚无供应商接入点</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      先选择协议、保存连接，再测试凭证与模型目录。
                    </Typography>
                    <Button variant="outlined" onClick={onCreate}>
                      创建第一个接入点
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : null}
            {!loading
              ? items.map((item) => (
                  <TableRow key={item.id} hover sx={{ opacity: item.enabled ? 1 : 0.72 }}>
                    <TableCell sx={{ minWidth: 190 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            bgcolor: item.enabled ? 'success.main' : 'text.disabled',
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                            {item.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.connectionKey}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={ADAPTER_LABELS[item.adapterKind]}
                        icon={<Iconify icon="solar:plug-circle-bold" width={16} />}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Tooltip title={item.baseUrl} placement="top-start">
                        <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                          {item.baseUrl}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {item.deploymentCount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ProbeStatus status={item.lastProbe?.status ?? null} durationMs={item.lastProbe?.durationMs} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Iconify
                          icon={item.apiKeyConfigured ? 'solar:lock-keyhole-bold' : 'solar:danger-triangle-bold'}
                          color={item.apiKeyConfigured ? 'success.main' : 'warning.main'}
                          width={18}
                        />
                        <Typography variant="caption">
                          {item.apiKeyConfigured ? `••••${item.apiKeyLastFour ?? ''}` : '未配置'}
                        </Typography>
                      </Stack>
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
                        <Tooltip title="测试连接">
                          <IconButton aria-label={`测试 ${item.displayName}`} onClick={() => onTest(item)}>
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

function ProbeStatus({ status, durationMs }: { status: string | null; durationMs?: number | null }) {
  if (!status) return <Chip size="small" variant="outlined" label="未测试" />;
  const passed = status === 'PASSED';
  return (
    <Stack spacing={0.25} alignItems="flex-start">
      <Chip
        size="small"
        color={passed ? 'success' : status === 'FAILED' ? 'error' : 'warning'}
        variant="outlined"
        label={passed ? '已验证' : status === 'FAILED' ? '测试失败' : '迁移待验证'}
      />
      {durationMs != null ? (
        <Typography variant="caption" color="text.secondary">
          {durationMs} ms
        </Typography>
      ) : null}
    </Stack>
  );
}
