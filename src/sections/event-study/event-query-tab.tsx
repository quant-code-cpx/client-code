import type { EventType, EventTypeItem, EventsQueryResult } from 'src/api/event-study';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
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
import CircularProgress from '@mui/material/CircularProgress';

import { queryEvents } from 'src/api/event-study';

import { EVENT_TABLE_COLUMNS } from './constants';

// ----------------------------------------------------------------------

type Props = {
  eventTypes: EventTypeItem[];
};

export function EventQueryTab({ eventTypes }: Props) {
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [tsCode, setTsCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EventsQueryResult | null>(null);
  const [error, setError] = useState('');

  const columns = eventType ? EVENT_TABLE_COLUMNS[eventType] : [];

  const handleQuery = async (newPage = 0) => {
    if (!eventType) return;
    setLoading(true);
    setError('');
    try {
      const data = await queryEvents({
        eventType,
        tsCode: tsCode || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: newPage + 1,
        pageSize,
      });
      setResult(data);
      setPage(newPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    handleQuery(newPage);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(Number(e.target.value));
    setPage(0);
  };

  return (
    <Stack spacing={3}>
      {/* 筛选栏 */}
      <Card sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel>事件类型 *</InputLabel>
            <Select
              value={eventType}
              label="事件类型 *"
              onChange={(e) => {
                setEventType(e.target.value as EventType);
                setResult(null);
                setPage(0);
              }}
            >
              {eventTypes.map((et) => (
                <MenuItem key={et.type} value={et.type}>
                  {et.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="股票代码"
            placeholder="如 000001.SZ"
            value={tsCode}
            onChange={(e) => setTsCode(e.target.value)}
            sx={{ minWidth: 150 }}
          />

          <TextField
            size="small"
            label="开始日期"
            placeholder="YYYYMMDD"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            sx={{ minWidth: 140 }}
          />

          <TextField
            size="small"
            label="结束日期"
            placeholder="YYYYMMDD"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            sx={{ minWidth: 140 }}
          />

          <Button
            variant="contained"
            disabled={!eventType || loading}
            onClick={() => handleQuery(0)}
          >
            查询
          </Button>
        </Stack>
      </Card>

      {/* 错误提示 */}
      {error && <Alert severity="error">{error}</Alert>}

      {/* 结果表格 */}
      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : result ? (
          <>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col.field} sx={{ minWidth: col.width ?? 100 }}>
                        {col.headerName}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          暂无匹配的事件记录
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.items.map((row, idx) => (
                      <TableRow key={idx} hover>
                        {columns.map((col) => (
                          <TableCell key={col.field}>
                            {row[col.field] != null ? String(row[col.field]) : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={result.total}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[20, 50, 100]}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              labelRowsPerPage="每页行数"
            />
          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              请选择事件类型后点击查询
            </Typography>
          </Box>
        )}
      </Card>
    </Stack>
  );
}
