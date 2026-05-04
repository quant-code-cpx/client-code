import type { MarketAnomaly } from 'src/api/alert';

import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { useAuth } from 'src/auth';
import { DashboardContent } from 'src/layouts/dashboard';

import {
  AnomalyHeaderBar,
  AnomalyFiltersBar,
  AnomalySummaryRow,
  AnomalyDetailDrawer,
  AnomalyTableWorkbench,
  useAnomalyMonitorState,
  AnomalyAddWatchlistDialog,
} from '../anomalies';

// ----------------------------------------------------------------------

export function AlertAnomaliesView() {
  const auth = useAuth();
  const isAdmin = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';

  const {
    filter,
    data,
    loading,
    error,
    refetch,
    setFilter,
    resetFilter,
    scanFeedback,
    dismissScanFeedback,
  } = useAnomalyMonitorState();

  const [detailAnomaly, setDetailAnomaly] = useState<MarketAnomaly | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [watchlistDialog, setWatchlistDialog] = useState<{ open: boolean; tsCode: string }>({
    open: false,
    tsCode: '',
  });
  const [actionFeedback, setActionFeedback] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const latestTradeDate = useMemo(() => {
    if (!items.length) return null;
    return items.reduce<string | null>((max, it) => {
      if (!max) return it.tradeDate;
      return it.tradeDate > max ? it.tradeDate : max;
    }, null);
  }, [items]);
  const scannedAt = useMemo(() => {
    if (!items.length) return null;
    const candidates = items.map((it) => it.scannedAt).filter((s): s is string => Boolean(s));
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, cur) => (cur > latest ? cur : latest), candidates[0]);
  }, [items]);

  const hasFilters =
    filter.types.length > 0 ||
    !!filter.keyword ||
    filter.scope !== 'ALL' ||
    filter.isNewOnly ||
    filter.multiTypeOnly;

  const handleOpenDetail = (anomaly: MarketAnomaly) => {
    setDetailAnomaly(anomaly);
    setDrawerOpen(true);
  };

  const handleCloseDetail = () => setDrawerOpen(false);

  const handleAddSingleToWatchlist = (tsCode: string) => {
    setWatchlistDialog({ open: true, tsCode });
  };

  return (
    <DashboardContent maxWidth="xl">
      <AnomalyHeaderBar
        latestTradeDate={latestTradeDate}
        filterTradeDate={filter.tradeDate}
        scannedAt={scannedAt}
        loading={loading}
        onRefresh={refetch}
        onScanned={refetch}
      />

      <AnomalyFiltersBar filter={filter} onChange={setFilter} onReset={resetFilter} />

      <AnomalySummaryRow
        data={data}
        loading={loading}
        currentPageItems={items.length}
        onClickNewOnly={() => setFilter({ isNewOnly: !filter.isNewOnly })}
        onClickMultiType={() => setFilter({ multiTypeOnly: !filter.multiTypeOnly })}
        onClickWatchlistScope={() =>
          setFilter({ scope: filter.scope === 'WATCHLIST' ? 'ALL' : 'WATCHLIST' })
        }
      />

      <Card>
        <AnomalyTableWorkbench
          items={items}
          loading={loading}
          error={error}
          total={total}
          pageIndex={filter.pageIndex}
          pageSize={filter.pageSize}
          hasFilters={hasFilters}
          isAdmin={isAdmin}
          onPageChange={(pageIndex) => setFilter({ pageIndex })}
          onPageSizeChange={(pageSize) => setFilter({ pageSize })}
          onClearFilter={resetFilter}
          onSwitchLatest={() => setFilter({ tradeDate: '' })}
          onScan={refetch}
          onRetry={refetch}
          onOpenDetail={handleOpenDetail}
        />
      </Card>

      <AnomalyDetailDrawer
        open={drawerOpen}
        anomaly={detailAnomaly}
        onClose={handleCloseDetail}
        onAddToWatchlist={handleAddSingleToWatchlist}
      />

      <AnomalyAddWatchlistDialog
        open={watchlistDialog.open}
        tsCodes={watchlistDialog.tsCode ? [watchlistDialog.tsCode] : []}
        onClose={() => setWatchlistDialog({ open: false, tsCode: '' })}
        onSuccess={(added, skipped) =>
          setActionFeedback({
            open: true,
            severity: 'success',
            message: `成功加入 ${added} 只，跳过 ${skipped} 只（已存在）`,
          })
        }
      />

      <Snackbar
        open={scanFeedback.open}
        autoHideDuration={4500}
        onClose={dismissScanFeedback}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={scanFeedback.severity}
          onClose={dismissScanFeedback}
          sx={{ width: '100%' }}
        >
          {scanFeedback.message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={actionFeedback.open}
        autoHideDuration={3500}
        onClose={() => setActionFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={actionFeedback.severity}
          onClose={() => setActionFeedback((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {actionFeedback.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
