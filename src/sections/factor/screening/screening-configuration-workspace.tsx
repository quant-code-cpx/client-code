import type {
  FactorDef,
  FactorCondition,
  FactorScreeningResult,
} from 'src/api/factor';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';

import { ScreeningQueryBar } from './screening-query-bar';
import { ScreeningFunnelPreview } from './screening-funnel-preview';
import { ScreeningConditionBuilder } from './screening-condition-builder';

import type { ScreeningQueryState } from './use-screening-state';
import type { ConditionValidation } from './screening-validation';

// ----------------------------------------------------------------------

type Props = {
  state: ScreeningQueryState;
  factorOptions: { name: string; label: string }[];
  loading: boolean;
  isStale: boolean;
  onQueryChange: (patch: Partial<ScreeningQueryState>) => void;
  onRun: () => void;
  onReset: () => void;
  libraryError: string;
  libraryLoading: boolean;
  onRetryLibrary: () => void;
  conditions: FactorCondition[];
  allFactors: FactorDef[];
  validation: ConditionValidation;
  onConditionsChange: (next: FactorCondition[]) => void;
  conditionPassCounts: FactorScreeningResult['conditionPassCounts'];
  error: string;
};

export function ScreeningConfigurationWorkspace({
  state,
  factorOptions,
  loading,
  isStale,
  onQueryChange,
  onRun,
  onReset,
  libraryError,
  libraryLoading,
  onRetryLibrary,
  conditions,
  allFactors,
  validation,
  onConditionsChange,
  conditionPassCounts,
  error,
}: Props) {
  return (
    <>
      <ScreeningQueryBar
        tradeDate={state.tradeDate}
        universe={state.universe}
        sortMode={state.sortMode}
        sortBy={state.sortBy}
        sortOrder={state.sortOrder}
        tradeConstraints={state.tradeConstraints}
        factorOptions={factorOptions}
        loading={loading}
        isStale={isStale}
        onChange={onQueryChange}
        onRun={onRun}
        onReset={onReset}
      />

      {libraryError !== '' && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={onRetryLibrary}>
              重试
            </Button>
          }
        >
          {libraryError}
        </Alert>
      )}

      {libraryLoading ? (
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, mb: 3 }} />
      ) : (
        <ScreeningConditionBuilder
          conditions={conditions}
          allFactors={allFactors}
          validation={validation}
          onChange={onConditionsChange}
        />
      )}

      <ScreeningFunnelPreview data={conditionPassCounts} allFactors={allFactors} />

      {error !== '' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </>
  );
}
