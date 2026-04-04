import type { AuditAction, AuditLogItem } from 'src/api/user-manage';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';

import { fDateTime } from 'src/utils/format-time';

import { AUDIT_ACTION_LABEL } from 'src/api/user-manage';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const AUDIT_ACTION_COLOR: Record<
  AuditAction,
  'info' | 'error' | 'warning' | 'success' | 'primary'
> = {
  USER_CREATE: 'success',
  USER_DELETE: 'error',
  USER_UPDATE_STATUS: 'warning',
  USER_UPDATE_INFO: 'info',
  USER_RESET_PASSWORD: 'primary',
};

const TABLE_HEAD = [
  { id: 'expand', label: '', width: 48 },
  { id: 'id', label: 'ID', width: 60 },
  { id: 'operatorAccount', label: '操作者', minWidth: 120 },
  { id: 'action', label: '操作类型', width: 130 },
  { id: 'targetAccount', label: '目标用户', minWidth: 120 },
  { id: 'ipAddress', label: 'IP 地址', width: 140 },
  { id: 'createdAt', label: '操作时间', width: 160 },
];

// ----------------------------------------------------------------------

function ExpandableRow({ row }: { row: AuditLogItem }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!row.details && Object.keys(row.details).length > 0;

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 48, px: 1 }}>
          {hasDetails && (
            <IconButton size="small" onClick={() => setOpen(!open)}>
              <Iconify
                icon={open ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                width={16}
              />
            </IconButton>
          )}
        </TableCell>
        <TableCell sx={{ width: 60 }}>{row.id}</TableCell>
        <TableCell sx={{ minWidth: 120 }}>{row.operatorAccount}</TableCell>
        <TableCell sx={{ width: 130 }}>
          <Label color={AUDIT_ACTION_COLOR[row.action]} variant="soft">
            {AUDIT_ACTION_LABEL[row.action] ?? row.action}
          </Label>
        </TableCell>
        <TableCell sx={{ minWidth: 120 }}>{row.targetAccount ?? '—'}</TableCell>
        <TableCell sx={{ width: 140, display: { xs: 'none', md: 'table-cell' } }}>
          {row.ipAddress ?? '—'}
        </TableCell>
        <TableCell sx={{ width: 160 }}>{fDateTime(row.createdAt)}</TableCell>
      </TableRow>

      {hasDetails && (
        <TableRow>
          <TableCell colSpan={TABLE_HEAD.length} sx={{ py: 0, borderBottom: 'none' }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  操作详情
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontSize: 12,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    p: 1.5,
                    overflow: 'auto',
                    maxHeight: 240,
                    m: 0,
                  }}
                >
                  {JSON.stringify(row.details, null, 2)}
                </Box>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

interface AuditLogTableProps {
  rows: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function AuditLogTable({
  rows,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
}: AuditLogTableProps) {
  return (
    <>
      <Scrollbar>
        <TableContainer sx={{ overflow: 'unset' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                {TABLE_HEAD.map((col) => (
                  <TableCell
                    key={col.id}
                    sx={{ width: col.width, minWidth: col.minWidth }}
                  >
                    {col.id && col.id !== 'expand' ? (
                      <TableSortLabel hideSortIcon>{col.label}</TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={TABLE_HEAD.length}>
                      <Skeleton variant="text" height={36} />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={TABLE_HEAD.length} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.disabled">
                      暂无审计日志记录
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => <ExpandableRow key={row.id} row={row} />)
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      <TablePagination
        component="div"
        page={page}
        count={total}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[20, 50, 100]}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => {
          onPageSizeChange(parseInt(e.target.value, 10));
        }}
        labelRowsPerPage="每页行数："
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} 共 ${count !== -1 ? count : `超过 ${to}`} 条`
        }
      />
    </>
  );
}
