import type { EventSample } from 'src/api/event-study';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  samples: EventSample[];
  color: 'success' | 'error';
};

export function EventAnalysisSamplesTable({ title, samples, color }: Props) {
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        <Typography variant="subtitle1" sx={{ px: 3, pt: 2, pb: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 120 }}>股票代码</TableCell>
                <TableCell sx={{ minWidth: 100 }}>名称</TableCell>
                <TableCell sx={{ minWidth: 120 }}>事件日期</TableCell>
                <TableCell sx={{ minWidth: 100 }}>CAR (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {samples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      暂无样本数据
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                samples.map((sample) => {
                  const carLabel = `${sample.car > 0 ? '+' : ''}${(sample.car * 100).toFixed(2)}%`;
                  const carColor = sample.car > 0 ? 'success' : 'error';
                  return (
                    <TableRow key={`${sample.tsCode}-${sample.eventDate}`} hover>
                      <TableCell>{sample.tsCode}</TableCell>
                      <TableCell>{sample.name ?? '-'}</TableCell>
                      <TableCell>{sample.eventDate}</TableCell>
                      <TableCell>
                        <Label color={carColor}>{carLabel}</Label>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
