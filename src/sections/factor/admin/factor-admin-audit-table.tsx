import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { ADMIN_AUDIT_ACTION_LABELS } from '../constants';

const PAGE_SIZE = 20;

export function FactorAdminAuditTable() {
  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" alignItems="flex-end">
        <TextField size="small" label="操作者" value="" disabled sx={{ width: 140 }} />
        <FormControl size="small" sx={{ minWidth: 130 }} disabled>
          <InputLabel>操作类型</InputLabel>
          <Select value="" label="操作类型">
            <MenuItem value="">全部</MenuItem>
            {Object.entries(ADMIN_AUDIT_ACTION_LABELS).map(([key, value]) => (
              <MenuItem key={key} value={key}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <DatePicker label="从" value={null} disabled sx={{ width: 148 }} />
        <DatePicker label="至" value={null} disabled sx={{ width: 148 }} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="solar:refresh-bold" />}
          disabled
        >
          刷新
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        审计日志接口当前为占位能力，筛选与刷新暂不可用。
      </Alert>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>时间</TableCell>
              <TableCell>操作者</TableCell>
              <TableCell>操作类型</TableCell>
              <TableCell>影响因子</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>结果</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                  暂无可用审计记录
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={0}
        page={0}
        rowsPerPage={PAGE_SIZE}
        rowsPerPageOptions={[PAGE_SIZE]}
        onPageChange={() => {}}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
      />
    </Box>
  );
}
