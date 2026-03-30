import type { FactorDef, FactorCategory, FactorLibraryResult } from 'src/api/factor';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { factorApi } from 'src/api/factor';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { FactorLibraryCard } from '../factor-library-card';
import { FactorLibraryCategoryTabs } from '../factor-library-category-tabs';

// ----------------------------------------------------------------------

export function FactorLibraryView() {
  const [library, setLibrary] = useState<FactorLibraryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<FactorCategory | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    factorApi
      .library()
      .then((data) => setLibrary(data))
      .catch((err) => setError(err instanceof Error ? err.message : '获取因子库失败'))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <DashboardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">因子库</Typography>

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
              <FactorLibraryCard factor={factor} />
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
    </DashboardContent>
  );
}
