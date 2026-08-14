import type { FactorDef } from 'src/api/factor';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { FactorLibraryCardV2 } from './factor-library-card';
import { FactorLibraryTable } from './factor-library-table';
import { FactorLibraryBulkBar } from './factor-library-bulk-bar';

import type { ViewMode } from './hooks/use-factor-library-filters';

// ----------------------------------------------------------------------

type Props = {
  loading: boolean;
  view: ViewMode;
  factors: FactorDef[];
  selectedNames: Set<string>;
  selectedFactors: FactorDef[];
  precomputingNames: Set<string>;
  batchPrecomputing: boolean;
  onClearSelection: () => void;
  onAddToScreening: () => void;
  onBatchPrecompute: () => void;
  onCopyNames: () => void;
  onToggleSelect: (factor: FactorDef) => void;
  onToggleSelectAll: (factors: FactorDef[], on: boolean) => void;
  onOpenDetail: (factor: FactorDef) => void;
  onEdit: (factor: FactorDef) => void;
  onDelete: (factor: FactorDef) => void;
  onPrecompute: (factor: FactorDef) => void;
  onToggleEnabled: (factor: FactorDef, isEnabled: boolean) => void;
  onResetFilters: () => void;
};

export function FactorLibraryResults({
  loading,
  view,
  factors,
  selectedNames,
  selectedFactors,
  precomputingNames,
  batchPrecomputing,
  onClearSelection,
  onAddToScreening,
  onBatchPrecompute,
  onCopyNames,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetail,
  onEdit,
  onDelete,
  onPrecompute,
  onToggleEnabled,
  onResetFilters,
}: Props) {
  return (
    <>
      <FactorLibraryBulkBar
        selected={selectedFactors}
        onClear={onClearSelection}
        onAddToScreening={onAddToScreening}
        onBatchPrecompute={onBatchPrecompute}
        onCopyNames={onCopyNames}
        batchPrecomputing={batchPrecomputing}
      />

      {loading ? (
        <Grid container spacing={2}>
          {[...Array(12)].map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : view === 'table' ? (
        <FactorLibraryTable
          factors={factors}
          selectedNames={selectedNames}
          onToggleSelect={onToggleSelect}
          onToggleSelectAll={onToggleSelectAll}
          onOpenDetail={onOpenDetail}
          onEdit={onEdit}
          onDelete={onDelete}
          onPrecompute={onPrecompute}
          precomputingNames={precomputingNames}
        />
      ) : (
        <Grid container spacing={2}>
          {factors.map((factor) => (
            <Grid key={factor.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <FactorLibraryCardV2
                factor={factor}
                selected={selectedNames.has(factor.name)}
                onToggleSelect={onToggleSelect}
                onOpenDetail={onOpenDetail}
                onEdit={factor.isBuiltin ? undefined : onEdit}
                onDelete={factor.isBuiltin ? undefined : onDelete}
                onPrecompute={factor.isBuiltin ? undefined : onPrecompute}
                onToggleEnabled={factor.isBuiltin ? undefined : onToggleEnabled}
                precomputing={precomputingNames.has(factor.name)}
              />
            </Grid>
          ))}
          {factors.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  当前筛选下无匹配因子
                </Typography>
                <Button size="small" onClick={onResetFilters}>
                  重置筛选
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </>
  );
}
