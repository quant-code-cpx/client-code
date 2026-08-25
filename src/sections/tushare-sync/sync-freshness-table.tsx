import type { OperationsFreshnessItem } from 'src/api/tushare-sync';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import {
  formatSyncTradeDate,
  resolveSyncDatasetLabel,
  SYNC_FRESHNESS_STATUS_META,
  type SyncLogNavigationHandler,
} from './sync-status-overview-model';

type SyncFreshnessTableProps = {
  freshness: OperationsFreshnessItem[];
  onGoLogs?: SyncLogNavigationHandler;
};

export function SyncFreshnessTable({ freshness, onGoLogs }: SyncFreshnessTableProps) {
  return (
    <Paper variant="outlined" sx={{ mt: 1.5, overflow: 'hidden' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 2, py: 1.5 }}
      >
        <Box>
          <Typography variant="subtitle1">日频接口新鲜度</Typography>
          <Typography variant="caption" color="text.secondary">
            核心接口优先；水位、应到日、质量和调度口径来自后端统一目录。
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          共 {freshness.length} 项
        </Typography>
      </Stack>
      <TableContainer>
        <Table size="small" aria-label="日频接口新鲜度">
          <TableHead>
            <TableRow>
              <TableCell>数据接口</TableCell>
              <TableCell>优先级</TableCell>
              <TableCell>当前水位</TableCell>
              <TableCell>应到交易日</TableCell>
              <TableCell>延迟</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>调度 / SLA</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {freshness.map((item) => {
              const meta =
                SYNC_FRESHNESS_STATUS_META[item.status] ?? SYNC_FRESHNESS_STATUS_META.UNKNOWN;
              return (
                <TableRow key={item.dataset} hover>
                  <TableCell>
                    <Tooltip title={`同步任务：${item.sourceTask}`}>
                      <Typography variant="body2" sx={{ fontWeight: 600, width: 'fit-content' }}>
                        {resolveSyncDatasetLabel(item.dataset, item.displayName)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Label
                      color={
                        item.criticality === 'CORE'
                          ? 'error'
                          : item.criticality === 'IMPORTANT'
                            ? 'warning'
                            : 'default'
                      }
                      variant="soft"
                    >
                      {item.criticality === 'CORE'
                        ? '核心'
                        : item.criticality === 'IMPORTANT'
                          ? '重要'
                          : '常规'}
                    </Label>
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatSyncTradeDate(item.dataThrough)}
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatSyncTradeDate(item.expectedTradeDate)}
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {item.lagTradingDays === null ? '—' : `${item.lagTradingDays} 个交易日`}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={item.reason}>
                      <span>
                        <Label color={meta.color} variant="soft">
                          {meta.label}
                        </Label>
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {item.schedule ?? '未配置'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.slaDueAt ? `SLA ${fDateTime(item.slaDueAt, 'HH:mm')}` : '无 SLA'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => onGoLogs?.({ task: item.sourceTask })}>
                      日志
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
