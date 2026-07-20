import type { TableBlock, TableCell as AgentTableCell } from 'src/types/agent/generated';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';

import { DataProvenance } from '../data-provenance';
import { toCsvCell, formatFinanceValue } from '../../lib/format-finance-value';

function cellValue(value: AgentTableCell | undefined, column: TableBlock['columns'][number]) {
  if (value == null) return '—';
  if (column.valueType === 'NUMBER' && typeof value === 'number') {
    return formatFinanceValue(value, { scale: column.scale });
  }
  if (column.valueType === 'BOOLEAN' && typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

function cellAlign(column: TableBlock['columns'][number]): 'left' | 'right' | 'center' {
  if (column.align === 'RIGHT' || column.valueType === 'NUMBER') return 'right';
  if (column.align === 'CENTER') return 'center';
  return 'left';
}

function toSafeCsv(block: TableBlock): string {
  const header = block.columns.map((column) => toCsvCell(column.label)).join(',');
  const rows = block.rows.map((row) =>
    block.columns.map((column) => toCsvCell(row[column.key] ?? null)).join(',')
  );
  return [header, ...rows].join('\n');
}

export function DataTableBlock({ block }: { block: TableBlock }) {
  const [copied, setCopied] = useState(false);
  const copyCsv = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toSafeCsv(block));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [block]);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">{block.title ?? '数据表'}</Typography>
        <Button
          size="small"
          variant="text"
          startIcon={<Iconify icon="solar:copy-bold" width={16} />}
          onClick={copyCsv}
          sx={{ ml: 'auto' }}
        >
          {copied ? '已复制' : '复制 CSV'}
        </Button>
      </Stack>
      {block.truncated ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          结果已截断，仅展示 {block.rows.length} 行
          {block.totalRows ? `，原始结果共 ${block.totalRows} 行` : ''}。
        </Alert>
      ) : null}
      <TableContainer sx={{ maxWidth: '100%', maxHeight: 440, border: '1px solid', borderColor: 'divider' }}>
        <Table size="small" stickyHeader aria-label={block.title ?? 'Agent 数据表'}>
          <TableHead>
            <TableRow>
              {block.columns.map((column) => (
                <TableCell key={column.key} align={cellAlign(column)}>
                  {column.label}
                  {column.unit ? `（${column.unit}）` : ''}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {block.rows.map((row, index) => (
              <TableRow key={String(row[block.rowKey] ?? index)} hover>
                {block.columns.map((column) => (
                  <TableCell key={column.key} align={cellAlign(column)}>
                    {cellValue(row[column.key], column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <DataProvenance provenance={block.provenance} />
    </Box>
  );
}
