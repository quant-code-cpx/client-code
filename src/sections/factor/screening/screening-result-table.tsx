import type { FactorDef, ScreeningItem, FactorScreeningResult } from 'src/api/factor';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  result: FactorScreeningResult | null;
  loading: boolean;
  factorColumns: string[];
  factorLabelMap: Map<string, string>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selected: Set<string>;
  onToggleRow: (tsCode: string) => void;
  onToggleAll: (next: boolean) => void;
  onOpenEvidence: (item: ScreeningItem) => void;
  isStale: boolean;
};

const tabularNum = { fontVariantNumeric: 'tabular-nums' as const };

function fmt(value: number | null | undefined, factor?: FactorDef): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  // 简单按因子名约定：含 pct/rate/ret 的按百分比
  const name = factor?.name?.toLowerCase() ?? '';
  if (name.includes('pct') || name.includes('rate') || name.includes('ratio')) {
    return `${(value * 100).toFixed(2)}%`;
  }
  return value.toFixed(4);
}

export function ScreeningResultTable({
  result,
  loading,
  factorColumns,
  factorLabelMap,
  page,
  pageSize,
  onPageChange,
  selected,
  onToggleRow,
  onToggleAll,
  onOpenEvidence,
  isStale,
}: Props) {
  if (!result) {
    return (
      <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 10 }}>
        <Iconify icon="solar:filter-bold" width={48} sx={{ color: 'text.disabled' }} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          请添加筛选条件后点击「运行选股」
        </Typography>
      </Stack>
    );
  }

  const hasItems = result.items.length > 0;
  const allSelected = hasItems && result.items.every((it) => selected.has(it.tsCode));
  const someSelected =
    hasItems && !allSelected && result.items.some((it) => selected.has(it.tsCode));

  return (
    <Box>
      {isStale && (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: 'warning.lighter',
            color: 'warning.darker',
            fontSize: 13,
          }}
        >
          条件已变更，当前结果对应旧条件快照，请重新运行选股以同步。
        </Box>
      )}

      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(_, v) => onToggleAll(v)}
                />
              </TableCell>
              <TableCell sx={{ width: 60 }}>排名</TableCell>
              <TableCell>股票代码</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>行业</TableCell>
              <TableCell align="right">综合分</TableCell>
              {factorColumns.map((name) => (
                <TableCell key={name} align="right">
                  <Tooltip title={name}>
                    <span>{factorLabelMap.get(name) ?? name}</span>
                  </Tooltip>
                </TableCell>
              ))}
              <TableCell sx={{ width: 80 }} align="center">
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.items.map((row, idx) => {
              const checked = selected.has(row.tsCode);
              const tags: { label: string; color: 'warning' | 'error' | 'default' }[] = [];
              if (row.isSt === true) tags.push({ label: 'ST', color: 'error' });
              if (row.isSuspended === true) tags.push({ label: '停牌', color: 'warning' });
              return (
                <TableRow
                  key={row.tsCode}
                  hover
                  selected={checked}
                  sx={{ opacity: loading ? 0.6 : 1 }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={() => onToggleRow(row.tsCode)}
                    />
                  </TableCell>
                  <TableCell sx={tabularNum}>{row.rank ?? page * pageSize + idx + 1}</TableCell>
                  <TableCell>
                    <Link
                      component={RouterLink}
                      href={`/stock/detail?code=${row.tsCode}`}
                      underline="hover"
                      variant="body2"
                      sx={tabularNum}
                    >
                      {row.tsCode}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <span>{row.name ?? '—'}</span>
                      {tags.map((t) => (
                        <Label key={t.label} color={t.color} variant="soft">
                          {t.label}
                        </Label>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{row.industry ?? '—'}</TableCell>
                  <TableCell align="right" sx={tabularNum}>
                    {row.score !== null && row.score !== undefined && Number.isFinite(row.score)
                      ? row.score.toFixed(2)
                      : '—'}
                  </TableCell>
                  {factorColumns.map((name) => (
                    <TableCell key={name} align="right" sx={tabularNum}>
                      {fmt(row.factors[name] ?? null)}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Button size="small" variant="text" onClick={() => onOpenEvidence(row)}>
                      解释
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7 + factorColumns.length} align="center" sx={{ py: 5 }}>
                  <Stack spacing={1} alignItems="center">
                    <Iconify icon="solar:filter-bold" width={36} sx={{ color: 'text.disabled' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      当前条件无命中。建议放宽阈值、检查股票池或核对数据日期。
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={result.total}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[pageSize]}
        onPageChange={(_, newPage) => onPageChange(newPage)}
      />
    </Box>
  );
}
