import type { DataQualityCheckItem } from 'src/api/tushare-sync';

import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const QUALITY_STATUS_COLOR: Record<string, 'success' | 'warning' | 'error'> = {
  pass: 'success',
  warn: 'warning',
  fail: 'error',
};

const QUALITY_STATUS_LABEL: Record<string, string> = {
  pass: '通过',
  warn: '警告',
  fail: '失败',
};

const CHECK_TYPE_LABEL: Record<string, string> = {
  completeness: '完整性',
  timeliness: '及时性',
  'cross-table': '跨表对账',
};

const CROSS_CHECK_LABEL: Record<string, string> = {
  'C-01': 'C-01 日线↔每日指标',
  'C-02': 'C-02 日线↔复权因子',
  'C-03': 'C-03 日线↔涨跌停',
  'C-04': 'C-04 日线↔停牌互斥',
  'C-05': 'C-05 利润表↔资产负债表',
  'C-06': 'C-06 利润表↔现金流量表',
  'C-07': 'C-07 指数权重→基础信息',
  'C-08': 'C-08 指数行情↔指数权重',
};

type Props = {
  rows: DataQualityCheckItem[];
  loading: boolean;
  days: number;
};

export function DataQualityReportTable({ rows, loading, days }: Props) {
  return (
    <Scrollbar>
      <TableContainer sx={{ overflow: 'unset' }}>
        <Table sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>数据集</TableCell>
              <TableCell>检查类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>消息</TableCell>
              <TableCell>检查时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton width={100} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={80} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={60} height={22} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Skeleton width={200} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={120} />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.checkType === 'cross-table'
                          ? (CROSS_CHECK_LABEL[row.dataSet] ?? row.dataSet)
                          : row.dataSet}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {CHECK_TYPE_LABEL[row.checkType] ?? row.checkType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Label color={QUALITY_STATUS_COLOR[row.status] ?? 'default'} variant="soft">
                        {QUALITY_STATUS_LABEL[row.status] ?? row.status}
                      </Label>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.message ?? '—'}
                      </Typography>
                      {row.checkType === 'completeness' &&
                        (row.details as { suspendedCount?: number } | null)?.suspendedCount !=
                          null &&
                        (row.details as { suspendedCount?: number })!.suspendedCount! > 0 && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.disabled', display: 'block' }}
                          >
                            （另有 {(row.details as { suspendedCount: number }).suspendedCount}{' '}
                            个停牌日正常缺失）
                          </Typography>
                        )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {fDate(row.checkDate, 'YYYY-MM-DD')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    最近 {days} 天暂无质量检查记录，点击上方按钮手动触发
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );
}
