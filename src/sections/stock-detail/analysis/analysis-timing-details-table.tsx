import type { TimingScoreDetail } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

// ----------------------------------------------------------------------

const SIGNAL_LABEL: Record<string, string> = {
  bullish: '看多',
  bearish: '看空',
  neutral: '中性',
};

function getSignalColor(signal: string): 'error' | 'success' | 'warning' | 'default' {
  const s = signal.toLowerCase();
  if (s === 'bullish' || s.includes('多头') || s.includes('金叉') || s.includes('看多'))
    return 'error';
  if (s === 'bearish' || s.includes('空头') || s.includes('死叉') || s.includes('看空'))
    return 'success';
  if (s === 'neutral' || s.includes('超买') || s.includes('警告')) return 'warning';
  return 'default';
}

type Props = { details: TimingScoreDetail[] };

export function AnalysisTimingDetailsTable({ details }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          多空打分明细
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>指标</TableCell>
                <TableCell>信号</TableCell>
                <TableCell sx={{ minWidth: 150 }}>分数</TableCell>
                <TableCell>原因</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {details.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.indicator}</TableCell>
                  <TableCell>
                    <Chip
                      label={SIGNAL_LABEL[row.signal] ?? row.signal}
                      color={getSignalColor(row.signal)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(0, Math.min(100, row.score))}
                        sx={{ flex: 1, height: 6, borderRadius: 1 }}
                      />
                      <Typography variant="body2">{row.score}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {row.reason}
                    </Typography>
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
