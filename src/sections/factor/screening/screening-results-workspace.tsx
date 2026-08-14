import type { FactorDef, FactorCondition, FactorScreeningResult } from 'src/api/factor';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { PAGE_SIZE } from './screening-constants';
import { ScreeningActionBar } from './screening-action-bar';
import { StockEvidenceDrawer } from './stock-evidence-drawer';
import { ScreeningResultTable } from './screening-result-table';
import { ScreeningResultKpiStrip } from './screening-result-kpi-strip';
import { ScreeningDiagnosticsPanel } from './screening-diagnostics-panel';

// ----------------------------------------------------------------------

export type ScreeningActionLogEntry = {
  time: string;
  message: string;
  severity: 'success' | 'warning' | 'error' | 'info';
};

type ResultTab = 'table' | 'diagnostics' | 'log';

type Props = {
  result: FactorScreeningResult | null;
  loading: boolean;
  factorColumns: string[];
  factorLabelMap: Map<string, string>;
  page: number;
  onPageChange: (page: number) => void;
  selected: Set<string>;
  onToggleRow: (tsCode: string) => void;
  onToggleAll: (next: boolean) => void;
  isStale: boolean;
  resultSnapshot: FactorCondition[];
  allFactors: FactorDef[];
  actionLog: ScreeningActionLogEntry[];
  canSavePreset: boolean;
  onClearSelection: () => void;
  onAddToWatchlist: () => void;
  onSavePreset: () => void;
  onSaveStrategy: () => void;
  onQuickBacktest: () => void;
  onCreateSubscription: () => void;
};

export function ScreeningResultsWorkspace({
  result,
  loading,
  factorColumns,
  factorLabelMap,
  page,
  onPageChange,
  selected,
  onToggleRow,
  onToggleAll,
  isStale,
  resultSnapshot,
  allFactors,
  actionLog,
  canSavePreset,
  onClearSelection,
  onAddToWatchlist,
  onSavePreset,
  onSaveStrategy,
  onQuickBacktest,
  onCreateSubscription,
}: Props) {
  const [tab, setTab] = useState<ResultTab>('table');
  const [evidenceItem, setEvidenceItem] = useState<FactorScreeningResult['items'][number] | null>(
    null
  );

  return (
    <>
      <ScreeningResultKpiStrip result={result} />

      <Card sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, value: ResultTab) => setTab(value)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="table" label="结果表" />
          <Tab value="diagnostics" label="诊断" />
          <Tab value="log" label={`动作日志 (${actionLog.length})`} />
        </Tabs>

        {tab === 'table' && (
          <ScreeningResultTable
            result={result}
            loading={loading}
            factorColumns={factorColumns}
            factorLabelMap={factorLabelMap}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={onPageChange}
            selected={selected}
            onToggleRow={onToggleRow}
            onToggleAll={onToggleAll}
            onOpenEvidence={setEvidenceItem}
            isStale={isStale}
          />
        )}

        {tab === 'diagnostics' && (
          <Box sx={{ p: 2 }}>
            <ScreeningDiagnosticsPanel result={result} />
          </Box>
        )}

        {tab === 'log' && (
          <Box sx={{ p: 2 }}>
            {actionLog.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                暂无动作记录。
              </Typography>
            ) : (
              <Stack spacing={1}>
                {actionLog.map((item, index) => (
                  <Alert key={index} severity={item.severity} variant="outlined" sx={{ py: 0.5 }}>
                    <Box component="span" sx={{ color: 'text.disabled', mr: 1 }}>
                      {item.time}
                    </Box>
                    {item.message}
                  </Alert>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Card>

      {result && (
        <ScreeningActionBar
          selectedCount={selected.size}
          totalCount={result.total}
          canSavePreset={canSavePreset}
          onClearSelection={onClearSelection}
          onAddToWatchlist={onAddToWatchlist}
          onSavePreset={onSavePreset}
          onSaveStrategy={onSaveStrategy}
          onQuickBacktest={onQuickBacktest}
          onCreateSubscription={onCreateSubscription}
        />
      )}

      <StockEvidenceDrawer
        open={evidenceItem !== null}
        item={evidenceItem}
        conditions={resultSnapshot}
        allFactors={allFactors}
        onClose={() => setEvidenceItem(null)}
      />
    </>
  );
}
