import type { TimingScoreDetail } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

// ----------------------------------------------------------------------

function getSignalColor(signal: string): 'error' | 'success' | 'warning' | 'default' {
  if (signal.includes('多头') || signal.includes('金叉') || signal.includes('看多')) return 'error';
  if (signal.includes('空头') || signal.includes('死叉') || signal.includes('看空')) return 'success';
  if (signal.includes('超买') || signal.includes('警告')) return 'warning';
  return 'default';
}

type Props = { details: TimingScoreDetail[] };

export function AnalysisTimingDetailsTable({ details }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>多空打分明细</Typography>
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
                    <Chip label={row.signal} color={getSignalColor(row.signal)} size="small" variant="outlined" />
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
                    <Typography variant="caption" color="text.secondary">{row.reason}</Typography>
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
