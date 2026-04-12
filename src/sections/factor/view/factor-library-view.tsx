import type { FactorDef, FactorCategory, FactorLibraryResult } from 'src/api/factor';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { DashboardContent } from 'src/layouts/dashboard';
import { factorApi, deleteCustomFactor, precomputeCustomFactor } from 'src/api/factor';

import { Iconify } from 'src/components/iconify';

import { FactorLibraryCard } from '../factor-library-card';
import { FactorCustomDialog } from '../factor-custom-dialog';
import { FactorLibraryCategoryTabs } from '../factor-library-category-tabs';

// ----------------------------------------------------------------------

export function FactorLibraryView() {
  const [library, setLibrary] = useState<FactorLibraryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<FactorCategory | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editFactor, setEditFactor] = useState<FactorDef | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<FactorDef | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const fetchLibrary = useCallback(() => {
    setLoading(true);
    setError('');
    factorApi
      .library()
      .then((data) => setLibrary(data))
      .catch((err) => setError(err instanceof Error ? err.message : '获取因子库失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const filteredFactors = useMemo<FactorDef[]>(() => {
    let factors = library?.categories.flatMap((c) => c.factors) ?? [];
    if (activeCategory !== 'ALL') {
      factors = factors.filter((f) => f.category === activeCategory);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      factors = factors.filter(
        (f) => f.name.toLowerCase().includes(lower) || f.label.includes(searchText)
      );
    }
    return factors;
  }, [library, activeCategory, searchText]);

  const handleEdit = useCallback((factor: FactorDef) => {
    setEditFactor(factor);
    setCustomDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteCustomFactor({ name: deleteTarget.name ?? deleteTarget.id });
      setSnackMsg(`已删除「${deleteTarget.label}」`);
      setDeleteTarget(null);
      fetchLibrary();
    } catch {
      setSnackMsg('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchLibrary]);

  const handlePrecompute = useCallback(async (factor: FactorDef) => {
    try {
      await precomputeCustomFactor({ name: factor.name ?? factor.id });
      setSnackMsg(`「${factor.label}」预计算任务已提交`);
    } catch {
      setSnackMsg('触发预计算失败');
    }
  }, []);

  const handleCustomDialogClose = useCallback(() => {
    setCustomDialogOpen(false);
    setEditFactor(undefined);
  }, []);

  return (
    <DashboardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">因子库</Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => setCustomDialogOpen(true)}
          >
            自定义因子
          </Button>
          <TextField
            size="small"
            placeholder="搜索因子名称..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && library && (
        <FactorLibraryCategoryTabs
          value={activeCategory}
          categories={library.categories}
          onChange={setActiveCategory}
        />
      )}

      {loading ? (
        <Grid container spacing={3}>
          {[...Array(12)].map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {filteredFactors.map((factor) => (
            <Grid key={factor.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <FactorLibraryCard
                factor={factor}
                onEdit={factor.isBuiltin ? undefined : handleEdit}
                onDelete={factor.isBuiltin ? undefined : setDeleteTarget}
                onPrecompute={factor.isBuiltin ? undefined : handlePrecompute}
              />
            </Grid>
          ))}
          {filteredFactors.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body1" color="text.secondary">
                  未找到符合条件的因子
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
      <FactorCustomDialog
        open={customDialogOpen}
        onClose={handleCustomDialogClose}
        onSuccess={fetchLibrary}
        editFactor={editFactor}
      />

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除自定义因子「{deleteTarget?.label}」吗？此操作不可撤销。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
          >
            {deleteLoading ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardContent>
  );
}
