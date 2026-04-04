import type { DataQualityCheckItem } from 'src/api/tushare-sync';

import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';

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
                  <TableRow key={row.id} hover={true}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.dataSet}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {CHECK_TYPE_LABEL[row.checkType] ?? row.checkType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Label
                        color={QUALITY_STATUS_COLOR[row.status] ?? 'default'}
                        variant="soft"
                      >
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
