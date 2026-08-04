import type { SubscriptionHitEvidence } from 'src/api/screener-subscription';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

// ----------------------------------------------------------------------

type Props = { evidence: SubscriptionHitEvidence[] };

function formatValue(
  value: SubscriptionHitEvidence['currentValue'] | SubscriptionHitEvidence['compareValue']
) {
  if (Array.isArray(value)) return value.join(' ~ ');
  return value ?? '—';
}

export function SubscriptionHitEvidenceTable({ evidence }: Props) {
  if (evidence.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        暂无命中证据。
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>股票</TableCell>
            <TableCell>指标</TableCell>
            <TableCell>前值</TableCell>
            <TableCell>现值</TableCell>
            <TableCell>阈值</TableCell>
            <TableCell>命中原因</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {evidence.map((item, index) => (
            <TableRow key={`${item.tsCode}-${item.metricId}-${index}`}>
              <TableCell>{item.tsCode}</TableCell>
              <TableCell>{item.metricLabel}</TableCell>
              <TableCell>{formatValue(item.previousValue)}</TableCell>
              <TableCell>{formatValue(item.currentValue)}</TableCell>
              <TableCell>{formatValue(item.compareValue)}</TableCell>
              <TableCell>
                <Box sx={{ minWidth: 180 }}>{item.reason}</Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
