import type { TechnicalSignalPeriod } from 'src/api/technical-signal';

import { useSearchParams } from 'react-router-dom';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { ApiError } from 'src/api/client';

import { TechnicalSignalMatrix } from './technical-signal-matrix';
import { TechnicalSignalMetaAlert } from './technical-signal-meta-alert';
import { TechnicalSignalFilterCard } from './technical-signal-filter-card';
import { TechnicalSignalDetailPanel } from './technical-signal-detail-panel';
import { useTechnicalSignalStatistics } from './use-technical-signal-statistics';
import { TechnicalSignalOccurrenceDrawer } from './technical-signal-occurrence-drawer';
import { PERIOD_LABELS, findSignalGroup, findHorizonStatistics } from './technical-signal-formatters';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

function isPeriod(value: string | null): value is TechnicalSignalPeriod {
  return value === '1Y' || value === '3Y' || value === 'CUSTOM';
}

function parseHorizon(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 60 ? parsed : null;
}

function catalogErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return '标准信号目录暂不可用，请稍后重试。';
  }
  return error instanceof Error ? error.message : '标准信号目录加载失败';
}

export function TechnicalSignalStatisticsPanel({ tsCode }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    appliedFilters,
    applyFilters,
    catalog,
    draftFilters,
    retryCatalog,
    retrySummary,
    summary,
    updateDraftFilters,
    validationError,
  } = useTechnicalSignalStatistics(tsCode, true);
  const groups = useMemo(() => summary.data?.groups ?? [], [summary.data]);
  const availablePeriods = useMemo(
    () => [...new Set(groups.map((group) => group.period))],
    [groups]
  );
  const periodParam = searchParams.get('period');
  const activePeriod =
    isPeriod(periodParam) && availablePeriods.includes(periodParam)
      ? periodParam
      : (availablePeriods.includes('1Y') ? '1Y' : availablePeriods[0]) ?? '1Y';
  const selectedGroup = findSignalGroup(groups, activePeriod, searchParams.get('signal'));
  const selectedHorizon = findHorizonStatistics(selectedGroup, parseHorizon(searchParams.get('horizon')));

  useEffect(() => {
    setDrawerOpen(false);
  }, [tsCode]);

  const updateLocation = useCallback(
    (update: { horizon?: number; period?: TechnicalSignalPeriod; signalKey?: string }) => {
      const nextParams = new URLSearchParams(searchParams);
      if (update.period) nextParams.set('period', update.period);
      if (update.signalKey) nextParams.set('signal', update.signalKey);
      if (update.horizon) nextParams.set('horizon', String(update.horizon));
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleDisableBenchmark = useCallback(() => {
    const nextFilters = { ...draftFilters, includeBenchmark: false };
    updateDraftFilters({ includeBenchmark: false });
    void applyFilters(nextFilters);
  }, [applyFilters, draftFilters, updateDraftFilters]);

  return (
    <Stack spacing={3}>
      <TechnicalSignalFilterCard
        definitions={catalog.data ?? []}
        disabled={catalog.loading || !catalog.data}
        filters={draftFilters}
        loading={summary.loading || summary.refreshing}
        onApply={() => void applyFilters()}
        onChange={updateDraftFilters}
        validationError={validationError}
      />

      {catalog.error ? (
        <Alert
          action={
            <Button color="inherit" onClick={() => void retryCatalog()} size="small">
              重试
            </Button>
          }
          severity="error"
        >
          {catalogErrorMessage(catalog.error)}
        </Alert>
      ) : null}

      <TechnicalSignalMetaAlert
        error={summary.error}
        meta={summary.data?.meta ?? null}
        onDisableBenchmark={handleDisableBenchmark}
        onRetry={() => void retrySummary()}
      />

      {summary.refreshing ? <LinearProgress /> : null}

      {summary.loading ? (
        <Stack spacing={2}>
          <Skeleton height={50} variant="rounded" />
          <Skeleton height={350} variant="rounded" />
          <Skeleton height={320} variant="rounded" />
        </Stack>
      ) : null}

      {!summary.loading && summary.data ? (
        <Stack spacing={3}>
          <Box>
            <Typography color="text.secondary" variant="caption" sx={{ display: 'block', mb: 0.75 }}>
              查看区间
            </Typography>
            <ToggleButtonGroup
              color="primary"
              exclusive
              onChange={(_, nextPeriod: TechnicalSignalPeriod | null) => {
                if (nextPeriod) updateLocation({ period: nextPeriod });
              }}
              size="small"
              value={activePeriod}
            >
              {availablePeriods.map((period) => (
                <ToggleButton key={period} value={period}>
                  {PERIOD_LABELS[period]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <TechnicalSignalMatrix
            activePeriod={activePeriod}
            definitions={catalog.data ?? []}
            groups={groups}
            onSelect={(signalKey, horizon) => updateLocation({ horizon, signalKey })}
            requestedHorizons={appliedFilters.horizons}
            selectedHorizon={selectedHorizon?.horizon ?? null}
            selectedSignalKey={selectedGroup?.signalKey ?? null}
          />

          <TechnicalSignalDetailPanel
            definition={
              catalog.data?.find((definition) => definition.signalKey === selectedGroup?.signalKey) ?? null
            }
            group={selectedGroup}
            horizon={selectedHorizon}
            onOpenOccurrences={() => setDrawerOpen(true)}
          />
        </Stack>
      ) : null}

      <TechnicalSignalOccurrenceDrawer
        entryMode={appliedFilters.entryMode}
        group={selectedGroup}
        includeBenchmark={appliedFilters.includeBenchmark}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen && !!summary.data}
        selectedHorizon={selectedHorizon?.horizon ?? null}
        tsCode={tsCode}
      />
    </Stack>
  );
}
