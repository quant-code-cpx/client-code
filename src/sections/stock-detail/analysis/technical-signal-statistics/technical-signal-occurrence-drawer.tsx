import type {
  OutcomeQualityStatus,
  SignalPeriodStatistics,
  TechnicalSignalEntryMode,
  TechnicalSignalOccurrence,
  TechnicalSignalOccurrenceListResponse,
} from 'src/api/technical-signal';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { technicalSignalApi } from 'src/api/technical-signal';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

import { isAbortError, formatPercent, formatTradeDate } from './technical-signal-formatters';

// ----------------------------------------------------------------------

type Props = {
  entryMode: TechnicalSignalEntryMode;
  group: SignalPeriodStatistics | null;
  includeBenchmark: boolean;
  onClose: () => void;
  open: boolean;
  selectedHorizon: number | null;
  tsCode: string;
};

const QUALITY_STATUSES: OutcomeQualityStatus[] = ['VALID', 'IMMATURE', 'MISSING'];

function qualityColor(status: OutcomeQualityStatus) {
  if (status === 'VALID') return 'success' as const;
  if (status === 'IMMATURE') return 'warning' as const;
  return 'error' as const;
}

function qualityLabel(status: OutcomeQualityStatus) {
  if (status === 'VALID') return '有效';
  if (status === 'IMMATURE') return '未到期';
  return '缺失';
}

function formatMfeMae(mfe: number | null | undefined, mae: number | null | undefined): string {
  return `${formatPercent(mfe)} / ${formatPercent(mae)}`;
}

function pathCoverageLabel(outcome: TechnicalSignalOccurrence['outcomes'][number] | undefined): string {
  if (!outcome) return '—';
  if (outcome.pathCoverageStatus === 'COMPLETE') return '完整';
  if (outcome.pathCoverageStatus === 'NOT_APPLICABLE') return '不适用';
  return outcome.pathMissingDates.length > 0 ? `部分（缺 ${outcome.pathMissingDates.length} 日）` : '部分';
}

function evidenceValue(value: boolean | number | string | null): string {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

function EvidenceBlock({ title, values }: { title: string; values: Record<string, boolean | number | string | null> }) {
  const entries = Object.entries(values);

  if (entries.length === 0) return null;

  return (
    <Box>
      <Typography color="text.secondary" variant="caption">
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 0.75,
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          mt: 0.75,
        }}
      >
        {entries.map(([key, value]) => (
          <Stack key={key} direction="row" justifyContent="space-between" spacing={1}>
            <Typography color="text.secondary" variant="caption">
              {key}
            </Typography>
            <Typography sx={{ fontVariantNumeric: 'tabular-nums' }} variant="caption">
              {evidenceValue(value)}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

function OccurrenceEvidence({ occurrence }: { occurrence: TechnicalSignalOccurrence }) {
  return (
    <Stack divider={<Divider flexItem />} spacing={1.5} sx={{ py: 1 }}>
      <EvidenceBlock title="触发前" values={occurrence.evidence.previous} />
      <EvidenceBlock title="触发当日" values={occurrence.evidence.current} />
      <EvidenceBlock title="定义参数" values={occurrence.evidence.parameters} />
    </Stack>
  );
}

export function TechnicalSignalOccurrenceDrawer({
  entryMode,
  group,
  includeBenchmark,
  onClose,
  open,
  selectedHorizon,
  tsCode,
}: Props) {
  const abortRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [qualityStatuses, setQualityStatuses] = useState<OutcomeQualityStatus[]>(QUALITY_STATUSES);
  const [retryKey, setRetryKey] = useState(0);
  const [result, setResult] = useState<TechnicalSignalOccurrenceListResponse | null>(null);

  useEffect(() => {
    if (!open) {
      setExpandedSignalId(null);
      setPage(0);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setExpandedSignalId(null);
      setPage(0);
    }
  }, [group?.semanticsVersion, group?.signalKey, open, selectedHorizon]);

  useEffect(() => {
    if (!open || !group || !selectedHorizon) return undefined;

    abortRef.current?.abort();
    const controller = new AbortController();
    const requestSequence = requestSequenceRef.current + 1;
    abortRef.current = controller;
    requestSequenceRef.current = requestSequence;
    setLoading(true);
    setError(null);
    setResult(null);

    technicalSignalApi
      .listOccurrences(
        {
          tsCode,
          signalKey: group.signalKey,
          semanticsVersion: group.semanticsVersion,
          startDate: group.requestedStartDate,
          endDate: group.endDate,
          horizons: [selectedHorizon],
          entryMode,
          includeBenchmark,
          qualityStatuses,
          page: page + 1,
          pageSize,
        },
        controller.signal
      )
      .then((nextResult) => {
        if (requestSequenceRef.current !== requestSequence) return;
        setResult(nextResult);
      })
      .catch((nextError: unknown) => {
        if (isAbortError(nextError) || requestSequenceRef.current !== requestSequence) return;
        setError(nextError);
      })
      .finally(() => {
        if (requestSequenceRef.current === requestSequence) setLoading(false);
      });

    return () => controller.abort();
  }, [
    entryMode,
    group,
    includeBenchmark,
    open,
    page,
    pageSize,
    qualityStatuses,
    retryKey,
    selectedHorizon,
    tsCode,
  ]);

  const items = result?.items ?? [];
  const handleQualityChange = (_: unknown, values: OutcomeQualityStatus[]) => {
    if (values.length === 0) return;
    setQualityStatuses(values);
    setPage(0);
    setExpandedSignalId(null);
  };

  return (
    <Drawer
      anchor="right"
      onClose={onClose}
      open={open}
      slotProps={{ paper: { sx: { width: 'min(760px, 58vw)' } } }}
    >
      <Stack spacing={2} sx={{ height: '100%', p: 3 }}>
        <Box>
          <Typography variant="h6">样本明细</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            {group ? `${group.signalKey} · T+${selectedHorizon ?? '—'}` : '选择信号后查看样本'}
          </Typography>
        </Box>

        <ToggleButtonGroup
          color="primary"
          onChange={handleQualityChange}
          size="small"
          value={qualityStatuses}
        >
          {QUALITY_STATUSES.map((status) => (
            <ToggleButton key={status} value={status}>
              {qualityLabel(status)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {loading ? <LinearProgress /> : null}
        {error ? (
          <Alert
            action={
              <Button color="inherit" onClick={() => setRetryKey((current) => current + 1)} size="small">
                重试
              </Button>
            }
            severity="error"
          >
            {error instanceof Error ? error.message : '样本明细加载失败'}
          </Alert>
        ) : null}

        <Scrollbar sx={{ flex: 1, minHeight: 0 }}>
          <Table size="small" sx={{ minWidth: 1260 }}>
            <TableHead>
              <TableRow>
                <TableCell>信号日</TableCell>
                <TableCell>质量</TableCell>
                <TableCell>预计入场日</TableCell>
                <TableCell>预计目标日</TableCell>
                <TableCell align="right">原始收益</TableCell>
                <TableCell align="right">方向收益</TableCell>
                <TableCell align="right">基准收益</TableCell>
                <TableCell align="right">超额收益</TableCell>
                <TableCell align="right">MFE / MAE</TableCell>
                <TableCell>路径覆盖</TableCell>
                <TableCell align="right">证据</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.flatMap((occurrence) => {
                const outcome = occurrence.outcomes.find((item) => item.horizon === selectedHorizon);
                const expanded = expandedSignalId === occurrence.signalId;

                return [
                    <TableRow hover key={occurrence.signalId}>
                      <TableCell>{formatTradeDate(occurrence.signalDate)}</TableCell>
                      <TableCell>
                        {outcome ? (
                          <Stack spacing={0.25}>
                            <Label color={qualityColor(outcome.qualityStatus)} variant="soft">
                              {qualityLabel(outcome.qualityStatus)}
                            </Label>
                            {outcome.missingReason ? (
                              <Typography color="text.secondary" variant="caption">
                                {outcome.missingReason}
                              </Typography>
                            ) : null}
                          </Stack>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatTradeDate(outcome?.expectedEntryDate)}</TableCell>
                      <TableCell>{formatTradeDate(outcome?.expectedTargetDate)}</TableCell>
                      <TableCell align="right">{formatPercent(outcome?.rawReturnPct)}</TableCell>
                      <TableCell align="right">{formatPercent(outcome?.directionalReturnPct)}</TableCell>
                      <TableCell align="right">
                        <Stack alignItems="flex-end" spacing={0.25}>
                          <Typography sx={{ fontVariantNumeric: 'tabular-nums' }} variant="body2">
                            {formatPercent(outcome?.benchmarkReturnPct)}
                          </Typography>
                          {outcome?.benchmarkMissingReason ? (
                            <Typography color="text.secondary" variant="caption">
                              {outcome.benchmarkMissingReason}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{formatPercent(outcome?.excessReturnPct)}</TableCell>
                      <TableCell align="right">
                        <Stack alignItems="flex-end" spacing={0.25}>
                          <Typography color="text.secondary" variant="caption">
                            原始 {formatMfeMae(outcome?.rawMfePct, outcome?.rawMaePct)}
                          </Typography>
                          <Typography color="text.secondary" variant="caption">
                            方向 {formatMfeMae(outcome?.directionalMfePct, outcome?.directionalMaePct)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{pathCoverageLabel(outcome)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          onClick={() => setExpandedSignalId(expanded ? null : occurrence.signalId)}
                          size="small"
                        >
                          {expanded ? '收起' : '查看'}
                        </Button>
                      </TableCell>
                    </TableRow>,
                    <TableRow key={`${occurrence.signalId}-evidence`}>
                      <TableCell colSpan={11} sx={{ py: 0 }}>
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                          <OccurrenceEvidence occurrence={occurrence} />
                        </Collapse>
                      </TableCell>
                    </TableRow>,
                ];
              })}
            </TableBody>
          </Table>

          {!loading && !error && items.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" variant="body2" sx={{ py: 5 }}>
              当前质量状态下没有样本明细。
            </Typography>
          ) : null}
        </Scrollbar>

        <TablePagination
          component="div"
          count={result?.total ?? 0}
          labelRowsPerPage="每页"
          onPageChange={(_, nextPage) => {
            setPage(nextPage);
            setExpandedSignalId(null);
          }}
          onRowsPerPageChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(0);
            setExpandedSignalId(null);
          }}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[20, 50, 100]}
        />
      </Stack>
    </Drawer>
  );
}
