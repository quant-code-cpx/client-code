import type { Strategy } from 'src/api/strategy';

import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { cloneStrategy, deleteStrategy, getStrategyDetail } from 'src/api/strategy';

import { StrategyInfoCard } from '../strategy-info-card';
import { StrategyConfigCard } from '../strategy-config-card';
import { StrategyCloneDialog } from '../strategy-clone-dialog';
import { StrategyDeleteDialog } from '../strategy-delete-dialog';
import { StrategyDetailHeader } from '../strategy-detail-header';
import { StrategyQuickRunPanel } from '../strategy-quick-run-panel';
import { StrategyRunHistoryCard } from '../strategy-run-history-card';
import { StrategyBacktestDefaultsCard } from '../strategy-backtest-defaults-card';

// ----------------------------------------------------------------------

export function StrategyDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getStrategyDetail({ id });
      setStrategy(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '获取策略详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCloneConfirm = async (name: string) => {
    if (!strategy) return;
    setCloning(true);
    try {
      const newStrategy = await cloneStrategy({ id: strategy.id, name });
      setCloneOpen(false);
      router.push(`/strategy/${newStrategy.id}`);
    } finally {
      setCloning(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!strategy) return;
    setDeleting(true);
    try {
      await deleteStrategy({ id: strategy.id });
      setDeleteOpen(false);
      router.push('/strategy');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardContent>
      {/* Header skeleton */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <Skeleton width={120} height={28} sx={{ mb: 2 }} />
          <Skeleton width={300} height={40} sx={{ mb: 1 }} />
          <Skeleton width={200} height={24} />
        </Box>
      )}

      {/* Error */}
      {!loading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Content */}
      {!loading && !error && strategy && (
        <>
          <StrategyDetailHeader
            strategy={strategy}
            onClone={() => setCloneOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />

          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              {/* Left column */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <StrategyInfoCard strategy={strategy} onUpdate={setStrategy} />
                  <StrategyConfigCard strategy={strategy} onUpdate={setStrategy} />
                  <StrategyBacktestDefaultsCard strategy={strategy} onUpdate={setStrategy} />
                </Box>
              </Grid>

              {/* Right column */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <StrategyQuickRunPanel strategy={strategy} />
                  <StrategyRunHistoryCard strategy={strategy} />
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Dialogs */}
          <StrategyCloneDialog
            open={cloneOpen}
            strategy={strategy}
            onClose={() => setCloneOpen(false)}
            onConfirm={handleCloneConfirm}
            submitting={cloning}
          />
          <StrategyDeleteDialog
            open={deleteOpen}
            strategy={strategy}
            onClose={() => setDeleteOpen(false)}
            onConfirm={handleDeleteConfirm}
            submitting={deleting}
          />
        </>
      )}

      {/* Not found */}
      {!loading && !error && !strategy && (
        <Box sx={{ py: 12, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            策略不存在或已被删除
          </Typography>
        </Box>
      )}
    </DashboardContent>
  );
}
