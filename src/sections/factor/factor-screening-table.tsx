import type { FactorCondition, FactorScreeningResult } from 'src/api/factor';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { Iconify } from 'src/components/iconify';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

type FactorScreeningTableProps = {
  result: FactorScreeningResult | null;
  conditions: FactorCondition[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function FactorScreeningTable({
  result,
  conditions,
  page,
  pageSize,
  onPageChange,
}: FactorScreeningTableProps) {
  const factorColumns = conditions
    .map((c) => c.factorName)
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  if (!result) {
    return (
      <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 10 }}>
        <Iconify icon="solar:filter-bold" width={48} sx={{ color: 'text.disabled' }} />
        <Typography variant="body2" color="text.secondary">
          请添加筛选条件后点击"开始选股"
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          共筛选出 <strong>{result.total}</strong> 只股票
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>排名</TableCell>
              <TableCell>股票代码</TableCell>
              <TableCell>股票名称</TableCell>
              <TableCell>所属行业</TableCell>
              {factorColumns.map((name) => (
                <TableCell key={name} align="right">
                  {name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {result.items.map((row, idx) => (
              <TableRow key={row.tsCode} hover={true}>
                <TableCell>{page * pageSize + idx + 1}</TableCell>
                <TableCell>
                  <Link
                    component={RouterLink}
                    href={`/stock/detail?code=${row.tsCode}`}
                    underline="hover"
                    variant="body2"
                  >
                    {row.tsCode}
                  </Link>
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.industry}</TableCell>
                {factorColumns.map((name) => (
                  <TableCell key={name} align="right">
                    {row.factors[name] !== null && row.factors[name] !== undefined
                      ? Number(row.factors[name]).toFixed(4)
                      : '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4 + factorColumns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    无符合条件的股票
                  </Typography>
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
