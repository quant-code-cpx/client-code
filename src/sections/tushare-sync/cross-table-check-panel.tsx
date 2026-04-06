import type { DataQualityCheckItem } from 'src/api/tushare-sync';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export const CROSS_CHECK_LABEL: Record<string, string> = {
  'C-01': 'C-01 日线↔每日指标',
  'C-02': 'C-02 日线↔复权因子',
  'C-03': 'C-03 日线↔涨跌停',
  'C-04': 'C-04 日线↔停牌互斥',
  'C-05': 'C-05 利润表↔资产负债表',
  'C-06': 'C-06 利润表↔现金流量表',
  'C-07': 'C-07 指数权重→基础信息',
  'C-08': 'C-08 指数行情↔指数权重',
};

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error'> = {
  pass: 'success',
  warn: 'warning',
  fail: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  pass: '通过',
  warn: '警告',
  fail: '失败',
};

type Props = {
  rows: DataQualityCheckItem[];
  loading: boolean;
  triggering: boolean;
  mode: 'recent' | 'full';
  onModeChange: (mode: 'recent' | 'full') => void;
  onRunCheck: () => void;
};

export function CrossTableCheckPanel({
  rows,
  loading,
  triggering,
  mode,
  onModeChange,
  onRunCheck,
}: Props) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          跨表一致性对账（最近 N 个交易日，对 8 组跨表关系逐项校验）
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && onModeChange(v)}
          size="small"
        >
          <ToggleButton value="recent">近期（默认）</ToggleButton>
          <ToggleButton value="full">全量（耗时较长）</ToggleButton>
        </ToggleButtonGroup>
        <LoadingButton
          loading={triggering}
          variant="outlined"
          color="info"
          size="small"
          startIcon={<Iconify icon="solar:restart-bold" />}
          onClick={onRunCheck}
        >
          立即执行对账
        </LoadingButton>
      </Box>

      <Scrollbar>
        <TableContainer sx={{ overflow: 'unset' }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell>对账项</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>消息</TableCell>
                <TableCell>检查时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton width={180} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={60} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={240} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={80} />
                      </TableCell>
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {CROSS_CHECK_LABEL[row.dataSet] ?? row.dataSet}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Label color={STATUS_COLOR[row.status] ?? 'default'} variant="soft">
                          {STATUS_LABEL[row.status] ?? row.status}
                        </Label>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320 }}>
                          {row.message ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {fDate(row.checkDate, 'MM-DD')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                      暂无跨表对账记录，点击上方按钮执行
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
        跨表对账每日同步后自动以 recent 模式执行；full
        模式建议在业务低谷期手动触发，检查范围更广但耗时更长。
      </Alert>
    </Box>
  );
}
