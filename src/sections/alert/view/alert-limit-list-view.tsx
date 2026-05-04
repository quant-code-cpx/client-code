import type { StockSearchItem } from 'src/api/stock';
import type {
  LimitListItem,
  LimitListMeta,
  LimitSummaryDay,
  LimitNextDayResponse,
} from 'src/api/alert';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchLimitList, fetchLimitSummary, fetchLimitNextDayPerf } from 'src/api/alert';

import { stockItemFromCode } from 'src/components/stock-search-autocomplete';

import { AlertLimitFilterBar } from '../limit/filter-bar';
import { AlertLimitTopSummary } from '../limit/top-summary';
import { AlertLimitHistoryTab } from '../limit/history-tab';
import { AlertLimitStockDrawer } from '../limit/stock-drawer';
import { AlertLimitListTableV2 } from '../limit/list-table-v2';
import { AlertLimitStreakLadder } from '../limit/streak-ladder';
import { AlertPriceRuleDialog } from '../alert-price-rule-dialog';
import { AlertLimitMainstreamBar } from '../limit/mainstream-bar';
import { AlertLimitNextDayMatrix } from '../limit/next-day-matrix';
import { useLimitFilters } from '../limit/hooks/use-limit-filters';
import { AlertLimitSealTimeHistogram } from '../limit/seal-time-histogram';

// ----------------------------------------------------------------------

function formatYYYYMMDD(value: string | undefined | null): string {
  if (!value) return '—';
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return fDate(value, 'YYYY-MM-DD');
}

export function AlertLimitListView() {
  const { state, update, reset } = useLimitFilters();

  const [items, setItems] = useState<LimitListItem[]>([]);
  const [meta, setMeta] = useState<LimitListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState<LimitSummaryDay[] | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [nextDay, setNextDay] = useState<LimitNextDayResponse | null>(null);
  const [nextDayLoading, setNextDayLoading] = useState(false);
  const [nextDayError, setNextDayError] = useState('');

  const [drawerItem, setDrawerItem] = useState<LimitListItem | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertTarget, setAlertTarget] = useState<StockSearchItem | null>(null);

  const tradeDateStr = state.tradeDate ? state.tradeDate.format('YYYYMMDD') : undefined;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchLimitList({
        trade_date: tradeDateStr,
        limit_type: state.limitType === 'ALL' ? undefined : state.limitType,
        min_consecutive: typeof state.minStreak === 'number' ? state.minStreak : undefined,
        industry: state.industry || undefined,
        concept: state.concept || undefined,
        mv_bucket: state.mvBucket || undefined,
        pct_chg_limit: state.pctChgLimit || undefined,
        seal_pattern: state.sealPattern || undefined,
      });
      setItems(result.items);
      setMeta(result.meta ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载涨跌停数据失败');
    } finally {
      setLoading(false);
    }
  }, [
    tradeDateStr,
    state.limitType,
    state.minStreak,
    state.industry,
    state.concept,
    state.mvBucket,
    state.pctChgLimit,
    state.sealPattern,
  ]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const result = await fetchLimitSummary({ trade_date: tradeDateStr, range: 5 });
      setSummary(result);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : '加载汇总失败');
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [tradeDateStr]);

  const fetchNextDay = useCallback(async () => {
    setNextDayLoading(true);
    setNextDayError('');
    try {
      const result = await fetchLimitNextDayPerf({ trade_date: tradeDateStr });
      setNextDay(result);
    } catch (err) {
      setNextDayError(err instanceof Error ? err.message : '加载次日表现失败');
      setNextDay(null);
    } finally {
      setNextDayLoading(false);
    }
  }, [tradeDateStr]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (state.tab === 'next-day') {
      fetchNextDay();
    }
  }, [state.tab, fetchNextDay]);

  // 行业 / 概念候选项（基于当前 items 聚合）
  const industries = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.industry) set.add(it.industry);
    });
    return Array.from(set).sort();
  }, [items]);

  const concepts = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      it.concepts?.forEach((c) => set.add(c));
    });
    return Array.from(set).sort();
  }, [items]);

  const handleSelect = (item: LimitListItem) => {
    setDrawerItem(item);
  };

  const handleCreateAlert = (item: LimitListItem) => {
    setAlertTarget(stockItemFromCode(item.tsCode));
    setAlertDialogOpen(true);
  };

  const handleScrollToLadder = () => {
    document
      .getElementById('limit-streak-ladder')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showHolidayNotice =
    meta?.actualDate && meta.requestedDate && meta.actualDate !== meta.requestedDate;

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack>
          <Typography variant="h4">涨跌停明细</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
            显示日期：{formatYYYYMMDD(meta?.actualDate ?? tradeDateStr ?? null)}
            {meta?.actualDate && !meta.requestedDate ? '（最近交易日）' : ''}
          </Typography>
        </Stack>
      </Stack>

      {showHolidayNotice ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          当前为非交易日，已自动切换至最近交易日 {formatYYYYMMDD(meta?.actualDate)}。
        </Alert>
      ) : null}

      <AlertLimitFilterBar
        state={state}
        onChange={update}
        onReset={reset}
        onRefresh={fetchList}
        industries={industries}
        concepts={concepts}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {/* KPI 摘要 */}
      <Stack sx={{ mb: 3 }}>
        {loading && !summary ? (
          <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 1.5 }} />
        ) : (
          <AlertLimitTopSummary
            items={items}
            summary={summaryLoading ? null : summary}
            onMaxStreakClick={handleScrollToLadder}
          />
        )}
      </Stack>

      <Tabs
        value={state.tab}
        onChange={(_e, v: 'today' | 'next-day' | 'history') => update({ tab: v })}
        sx={{ mb: 2 }}
      >
        <Tab value="today" label="今日明细" />
        <Tab value="next-day" label="次日表现" />
        <Tab value="history" label="历史回溯" />
      </Tabs>

      {state.tab === 'today' ? (
        <Stack spacing={3}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <AlertLimitMainstreamBar
                items={items}
                onIndustryClick={(industry) => update({ industry })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AlertLimitSealTimeHistogram items={items} />
            </Grid>
          </Grid>

          <div id="limit-streak-ladder">
            <AlertLimitStreakLadder items={items} onSelect={handleSelect} />
          </div>

          {loading ? (
            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
          ) : (
            <AlertLimitListTableV2
              items={items}
              onSelect={handleSelect}
              onCreateAlert={handleCreateAlert}
            />
          )}
        </Stack>
      ) : null}

      {state.tab === 'next-day' ? (
        <AlertLimitNextDayMatrix data={nextDay} loading={nextDayLoading} error={nextDayError} />
      ) : null}

      {state.tab === 'history' ? (
        <AlertLimitHistoryTab summary={summary} loading={summaryLoading} error={summaryError} />
      ) : null}

      <AlertLimitStockDrawer
        open={drawerItem != null}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
        onCreateAlert={handleCreateAlert}
      />

      <AlertPriceRuleDialog
        open={alertDialogOpen}
        rule={null}
        defaultStock={alertTarget}
        defaultRuleType="LIMIT_UP"
        onClose={() => setAlertDialogOpen(false)}
        onSaved={() => setAlertDialogOpen(false)}
      />
    </DashboardContent>
  );
}
