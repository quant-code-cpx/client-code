import type { PortfolioListItem, CreatePortfolioRequest, UpdatePortfolioRequest } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { listPortfolios, deletePortfolio, createPortfolio, updatePortfolio } from 'src/api/portfolio';

import { Iconify } from 'src/components/iconify';

import { PortfolioCard } from '../portfolio-card';
import { PortfolioEditDialog } from '../portfolio-edit-dialog';
import { PortfolioCreateDialog } from '../portfolio-create-dialog';
import { PortfolioDeleteDialog } from '../portfolio-delete-dialog';

// ----------------------------------------------------------------------

export function PortfolioListView() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editPortfolio, setEditPortfolio] = useState<PortfolioListItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deletePortfolioItem, setDeletePortfolioItem] = useState<PortfolioListItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchPortfolios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listPortfolios();
      setPortfolios(data);
    } catch {
      setError('加载组合列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const handleCreate = async (data: CreatePortfolioRequest) => {
    setCreateSubmitting(true);
    try {
      await createPortfolio(data);
      setCreateOpen(false);
      await fetchPortfolios();
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEdit = async (data: UpdatePortfolioRequest) => {
    setEditSubmitting(true);
    try {
      await updatePortfolio(data);
      setEditPortfolio(null);
      await fetchPortfolios();
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePortfolioItem) return;
    setDeleteSubmitting(true);
    try {
      await deletePortfolio({ portfolioId: deletePortfolioItem.id });
      setDeletePortfolioItem(null);
      await fetchPortfolios();
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">我的组合</Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={() => setCreateOpen(true)}
        >
          新建组合
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {portfolios.map((p) => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <PortfolioCard
                portfolio={p}
                onView={(id) => router.push(`/portfolio/${id}`)}
                onEdit={setEditPortfolio}
                onDelete={setDeletePortfolioItem}
              />
            </Grid>
          ))}
          {portfolios.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography color="text.secondary" textAlign="center" sx={{ py: 8 }}>
                暂无组合，点击「新建组合」开始
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      <PortfolioCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreate}
        submitting={createSubmitting}
      />

      <PortfolioEditDialog
        open={Boolean(editPortfolio)}
        portfolio={editPortfolio}
        onClose={() => setEditPortfolio(null)}
        onConfirm={handleEdit}
        submitting={editSubmitting}
      />

      <PortfolioDeleteDialog
        open={Boolean(deletePortfolioItem)}
        portfolio={deletePortfolioItem}
        onClose={() => setDeletePortfolioItem(null)}
        onConfirm={handleDelete}
        submitting={deleteSubmitting}
      />
    </DashboardContent>
  );
}
