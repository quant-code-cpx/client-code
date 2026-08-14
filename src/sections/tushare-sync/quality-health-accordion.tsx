import type { SyntheticEvent } from 'react';
import type { QualityCheckSummary, QualityHealthStatus } from 'src/api/tushare-sync';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { Iconify } from 'src/components/iconify';

import { QualityHealthBanner } from './quality-health-banner';
import { QualitySummaryCards } from './quality-summary-cards';

type Props = {
  expanded: boolean;
  health: QualityHealthStatus | null;
  summary: QualityCheckSummary | null;
  healthLoading: boolean;
  summaryLoading: boolean;
  healthError: string;
  summaryError: string;
  onChange: (_event: SyntheticEvent, expanded: boolean) => void;
  onRetryHealth: () => void;
  onRetrySummary: () => void;
};

export function QualityHealthAccordion({
  expanded,
  health,
  summary,
  healthLoading,
  summaryLoading,
  healthError,
  summaryError,
  onChange,
  onRetryHealth,
  onRetrySummary,
}: Props) {
  return (
    <Accordion
      expanded={expanded}
      onChange={onChange}
      slotProps={{ transition: { unmountOnExit: true } }}
    >
      <AccordionSummary
        expandIcon={<Iconify icon="solar:alt-arrow-down-bold" />}
        aria-controls="quality-health-content"
        id="quality-health-header"
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          健康总览
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {healthError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={onRetryHealth}>
                重试
              </Button>
            }
          >
            {healthError}
            {health ? '，当前展示上次成功快照。' : ''}
          </Alert>
        )}
        {summaryError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={onRetrySummary}>
                重试
              </Button>
            }
          >
            {summaryError}
            {summary ? '，当前展示上次成功快照。' : ''}
          </Alert>
        )}
        <QualityHealthBanner health={health} loading={healthLoading} />
        <QualitySummaryCards
          summary={summary}
          loading={summaryLoading}
          showEmptyState={!summaryError}
        />
      </AccordionDetails>
    </Accordion>
  );
}
