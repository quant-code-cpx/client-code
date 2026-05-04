import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { Scrollbar } from 'src/components/scrollbar';

import {
  formatCompactDate,
  computeTotalParamCombinations,
  generateWalkForwardWindowPreview,
} from './walk-forward-utils';

// ----------------------------------------------------------------------

type Props = {
  fullStartDate: string;
  fullEndDate: string;
  inSampleDays: number;
  outOfSampleDays: number;
  stepDays: number;
  purgeDays: number;
  embargoDays: number;
  paramSearchSpace: Record<
    string,
    { type: 'range' | 'enum'; min?: number; max?: number; step?: number; values?: unknown[] }
  >;
};

function BudgetChip({ totalJobs }: { totalJobs: number }) {
  const tone = totalJobs > 2000 ? 'error' : totalJobs > 500 ? 'warning' : 'success';
  const label = totalJobs > 2000 ? '预算过高' : totalJobs > 500 ? '需复核' : '预算健康';

  return <Chip size="small" color={tone} label={label} />;
}

export function WalkForwardWindowPreview({
  fullStartDate,
  fullEndDate,
  inSampleDays,
  outOfSampleDays,
  stepDays,
  purgeDays,
  embargoDays,
  paramSearchSpace,
}: Props) {
  const windows = generateWalkForwardWindowPreview({
    fullStartDate,
    fullEndDate,
    inSampleDays,
    outOfSampleDays,
    stepDays,
    purgeDays,
    embargoDays,
  });
  const combos = computeTotalParamCombinations(paramSearchSpace);
  const totalJobs = Math.max(1, windows.length) * Math.max(1, combos);

  return (
    <Card
      sx={(theme) => ({
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.04),
      })}
    >
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="subtitle2">窗口预览与计算预算</Typography>
            <Typography variant="caption" color="text.secondary">
              预览按自然日估算，真实交易日切窗以后端结果为准。
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${windows.length} 个窗口`} />
            <Chip size="small" label={`${combos || 0} 组参数`} />
            <Chip size="small" label={`约 ${totalJobs} 次回测`} />
            <BudgetChip totalJobs={totalJobs} />
          </Stack>
        </Stack>

        {windows.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="body2">
              当前区间无法生成完整样本外窗口，请延长区间或缩短 IS/OOS。
            </Typography>
          </Box>
        ) : (
          <Scrollbar>
            <TableContainer sx={{ maxHeight: 260 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>窗口</TableCell>
                    <TableCell>样本内</TableCell>
                    <TableCell>样本外</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {windows.slice(0, 8).map((window) => (
                    <TableRow key={window.windowIndex}>
                      <TableCell>#{window.windowIndex + 1}</TableCell>
                      <TableCell>
                        {formatCompactDate(window.isStartDate)} ~{' '}
                        {formatCompactDate(window.isEndDate)}
                      </TableCell>
                      <TableCell>
                        {formatCompactDate(window.oosStartDate)} ~{' '}
                        {formatCompactDate(window.oosEndDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>
        )}

        {windows.length > 8 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            已展示前 8 个窗口，其余窗口提交后在详情页查看。
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
