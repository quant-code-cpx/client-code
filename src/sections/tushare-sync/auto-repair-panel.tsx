import type { RepairSummary, RepairQueueStatus } from 'src/api/tushare-sync';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const REPAIR_TYPE_LABEL: Record<string, string> = {
  'resync-dates': '按日期重同步',
  'resync-dataset': '重建数据集',
  'no-action': '不支持自动补数',
};

type StatusCardProps = {
  label: string;
  value: number;
  color?: string;
};

function StatusCard({ label, value, color }: StatusCardProps) {
  return (
    <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ color: color ?? 'text.primary' }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Card>
  );
}

type Props = {
  summary: RepairSummary | null;
  queueStatus: RepairQueueStatus | null;
  queueLoading: boolean;
  repairing: boolean;
  onTriggerRepair: () => void;
};

export function AutoRepairPanel({
  summary,
  queueStatus,
  queueLoading,
  repairing,
  onTriggerRepair,
}: Props) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          补数队列状态
        </Typography>
        <LoadingButton
          loading={repairing}
          variant="outlined"
          color="warning"
          size="small"
          startIcon={<Iconify icon="solar:restart-bold" />}
          onClick={onTriggerRepair}
        >
          手动触发补数
        </LoadingButton>
      </Box>

      {/* 队列状态卡片 */}
      {queueLoading ? (
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid key={i} size={{ xs: 6, sm: 3 }}>
              <Skeleton variant="rounded" height={72} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatusCard
              label="待执行"
              value={queueStatus?.pending ?? 0}
              color={queueStatus?.pending ? 'info.main' : undefined}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatusCard
              label="重试中"
              value={queueStatus?.retrying ?? 0}
              color={queueStatus?.retrying ? 'warning.main' : undefined}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatusCard label="已成功" value={queueStatus?.succeeded ?? 0} color="success.main" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatusCard
              label="已耗尽"
              value={queueStatus?.exhausted ?? 0}
              color={queueStatus?.exhausted ? 'error.main' : undefined}
            />
          </Grid>
        </Grid>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* 最近一次补数任务详情 */}
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        最近一次补数任务详情
      </Typography>

      {!summary ? (
        <Typography variant="body2" sx={{ color: 'text.disabled', mb: 2 }}>
          暂无补数记录，点击上方「手动触发补数」生成任务
        </Typography>
      ) : (
        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 580 }}>
              <TableHead>
                <TableRow>
                  <TableCell>数据集</TableCell>
                  <TableCell>补数类型</TableCell>
                  <TableCell>缺失日期数</TableCell>
                  <TableCell>操作类型</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.tasks.map((task, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {task.dataSet}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: task.repairType === 'no-action' ? 'text.disabled' : 'text.primary',
                        }}
                      >
                        {task.repairType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {task.missingDates?.length ? `${task.missingDates.length} 个` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: task.repairType === 'no-action' ? 'text.disabled' : 'text.primary',
                        }}
                      >
                        {REPAIR_TYPE_LABEL[task.repairType] ?? task.repairType}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      )}

      {summary && summary.executed > 0 && (
        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          补数任务已入重试队列，将在后台自动执行，可在「重试队列」Tab
          查看进度。财务类数据不支持自动按日期补数，需手动重建。
        </Alert>
      )}
    </Box>
  );
}
