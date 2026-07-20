import type { FinancialMetricsBlock as FinancialMetricsBlockValue } from 'src/types/agent/generated';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { DataProvenance } from '../data-provenance';
import { formatFinanceValue } from '../../lib/format-finance-value';

export function FinancialMetricsBlock({ block }: { block: FinancialMetricsBlockValue }) {
  const metricOrder = new Map<string, { label: string; unit?: string; scale?: 'PERCENT' | 'DECIMAL' }>();
  block.periods.forEach((period) =>
    period.metrics.forEach((metric) => {
      if (!metricOrder.has(metric.key)) {
        metricOrder.set(metric.key, { label: metric.label, unit: metric.unit, scale: metric.scale });
      }
    })
  );

  return (
    <Box>
      <Typography variant="subtitle1">{block.title ?? `${block.tsCode} 财务指标`}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        报告期、公告日与可用时点分开显示，避免前视偏差。
      </Typography>
      <TableContainer sx={{ mt: 1, maxWidth: '100%', border: '1px solid', borderColor: 'divider' }}>
        <Table size="small" aria-label={`${block.tsCode} 财务指标`}>
          <TableHead>
            <TableRow>
              <TableCell>指标</TableCell>
              {block.periods.map((period) => (
                <TableCell key={period.reportPeriod} align="right">
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                    {period.reportPeriod}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    公告 {period.announcementDate ?? '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
                    可用 {period.availableAt ?? '—'}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...metricOrder.entries()].map(([key, metadata]) => (
              <TableRow key={key} hover>
                <TableCell>{metadata.label}{metadata.unit ? `（${metadata.unit}）` : ''}</TableCell>
                {block.periods.map((period) => {
                  const metric = period.metrics.find((item) => item.key === key);
                  return (
                    <TableCell key={period.reportPeriod} align="right">
                      {formatFinanceValue(metric?.value, {
                        scale: metric?.scale,
                      })}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <DataProvenance provenance={block.provenance} />
    </Box>
  );
}
