import type { Dayjs } from 'dayjs';
import type { StockSearchItem } from 'src/api/stock';
import type {
  EventType,
  EventTypeItem,
  MarketCapBucket,
  EventsQueryResult,
} from 'src/api/event-study';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
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
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { fDate } from 'src/utils/format-time';

import { queryEvents } from 'src/api/event-study';

import { DatePicker } from 'src/components/date-picker';
import { StockSearchAutocomplete } from 'src/components/stock-search-autocomplete';

import { DataState } from './_shared/data-state';
import { EventDetailDrawer } from './_shared/event-detail-drawer';
import { INDUSTRY_OPTIONS, MARKET_CAP_BUCKETS, EVENT_TABLE_COLUMNS } from './constants';

// ----------------------------------------------------------------------

const DATE_FIELDS = new Set(['annDate', 'endDate', 'exDate', 'floatDate', 'expDate', 'eventDate']);

function formatEventCell(value: unknown, field: string): string {
  if (value === null || value === undefined || value === '') return '-';
  if (DATE_FIELDS.has(field) && typeof value === 'string') {
    return fDate(value) || String(value);
  }
  return String(value);
}

type Props = {
  eventTypes: EventTypeItem[];
};

export function EventQueryTab({ eventTypes }: Props) {
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [selectedStock, setSelectedStock] = useState<StockSearchItem | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [marketCapBucket, setMarketCapBucket] = useState<MarketCapBucket | ''>('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EventsQueryResult | null>(null);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRow, setDrawerRow] = useState<Record<string, unknown> | null>(null);

  const columns = eventType ? EVENT_TABLE_COLUMNS[eventType] : [];
  const hasQueried = result !== null;

  const handleQuery = async (newPage = 0) => {
    if (!eventType) return;
    setLoading(true);
    setError('');
    try {
      const data = await queryEvents({
        eventType,
        tsCode: selectedStock?.tsCode || undefined,
        industry: industry || undefined,
        marketCapBucket: marketCapBucket || undefined,
        startDate: startDate ? startDate.format('YYYYMMDD') : undefined,
        endDate: endDate ? endDate.format('YYYYMMDD') : undefined,
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

  const handleRowClick = (row: Record<string, unknown>) => {
    setDrawerRow(row);
    setDrawerOpen(true);
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
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
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StockSearchAutocomplete
              label="股票代码"
              value={selectedStock}
              onChange={(item) => setSelectedStock(item)}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              size="small"
              options={INDUSTRY_OPTIONS}
              value={industry}
              onChange={(_, v) => setIndustry(v)}
              renderInput={(params) => <TextField {...params} label="行业" />}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>市值档位</InputLabel>
              <Select
                value={marketCapBucket}
                label="市值档位"
                onChange={(e) => setMarketCapBucket(e.target.value as MarketCapBucket | '')}
              >
                <MenuItem value="">不限</MenuItem>
                {MARKET_CAP_BUCKETS.map((b) => (
                  <MenuItem key={b.value} value={b.value}>
                    {b.label}
                    <Box component="span" sx={{ ml: 1, color: 'text.secondary', fontSize: 12 }}>
                      {b.hint}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DatePicker
              label="开始日期"
              value={startDate}
              onChange={(v) => setStartDate(v)}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DatePicker
              label="结束日期"
              value={endDate}
              onChange={(v) => setEndDate(v)}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                disabled={!eventType || loading}
                onClick={() => handleQuery(0)}
              >
                查询
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <DataState
          loading={loading}
          empty={hasQueried && (result?.items.length ?? 0) === 0}
          emptyText={!eventType ? '请选择事件类型后点击查询' : '暂无匹配的事件记录'}
        >
          {hasQueried && result ? (
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
                    {result.items.map((row, idx) => (
                      <TableRow
                        key={idx}
                        hover
                        role="button"
                        tabIndex={0}
                        aria-label={`查看第 ${idx + 1} 条事件详情`}
                        sx={{
                          cursor: 'pointer',
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: -2,
                          },
                        }}
                        onClick={() => handleRowClick(row)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return;
                          event.preventDefault();
                          handleRowClick(row);
                        }}
                      >
                        {columns.map((col) => (
                          <TableCell key={col.field}>
                            {formatEventCell(row[col.field], col.field)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
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
          ) : null}
        </DataState>
      </Card>

      <EventDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        eventType={eventType}
        detail={drawerRow}
      />
    </Stack>
  );
}
