import type { LimitSummaryDay } from 'src/api/alert';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@mui/material/styles';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';
import { fNumber, fPercent } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
  summary: LimitSummaryDay[] | null;
  loading?: boolean;
  error?: string;
};

function formatYYYYMMDD(value: string): string {
  // 8 位整数日期 → YYYY-MM-DD
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return fDate(value, 'YYYY-MM-DD');
}

function MiniBar({ data, color, max }: { data: number[]; color: string; max: number }) {
  return (
    <Stack direction="row" spacing={0.25} alignItems="flex-end" sx={{ height: 28 }}>
      {data.map((v, i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: `${max ? (v / max) * 100 : 0}%`,
            bgcolor: color,
            borderRadius: '1px 1px 0 0',
          }}
        />
      ))}
    </Stack>
  );
}

export function AlertLimitHistoryTab({ summary, loading, error }: Props) {
  const theme = useTheme();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            加载中…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary || summary.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            历史回溯
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
            {error ? error : '即将上线 — 等待后端端点 /api/alert/limit-summary'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const ascending = [...summary].reverse();
  const upMax = ascending.reduce((m, d) => Math.max(m, d.limitUp), 1);
  const streakMax = ascending.reduce((m, d) => Math.max(m, d.maxStreak), 1);

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              近 {summary.length} 日 涨停家数
            </Typography>
            <MiniBar
              data={ascending.map((d) => d.limitUp)}
              color={theme.vars.palette.error.main}
              max={upMax}
            />
          </Stack>
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              近 {summary.length} 日 最高板
            </Typography>
            <MiniBar
              data={ascending.map((d) => d.maxStreak)}
              color={theme.vars.palette.warning.main}
              max={streakMax}
            />
          </Stack>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>日期</TableCell>
                <TableCell align="right">涨停</TableCell>
                <TableCell align="right">跌停</TableCell>
                <TableCell align="right">最高板</TableCell>
                <TableCell align="right">封板率</TableCell>
                <TableCell align="right">晋级率</TableCell>
                <TableCell align="right">炸板率</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((d) => (
                <TableRow key={d.date}>
                  <TableCell>{formatYYYYMMDD(d.date)}</TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"' }}>
                    {fNumber(d.limitUp)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"' }}>
                    {fNumber(d.limitDown)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"' }}>
                    {d.maxStreak}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"' }}>
                    {d.sealRate != null ? fPercent(d.sealRate * 100) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"' }}>
                    {d.promoteRate != null ? fPercent(d.promoteRate * 100) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"' }}>
                    {d.failRate != null ? fPercent(d.failRate * 100) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
