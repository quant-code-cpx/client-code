import type { RiskNoticeBlock as RiskNoticeBlockValue } from 'src/types/agent/generated';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import { DataProvenance } from '../data-provenance';

const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'error',
} as const;

export function RiskNoticeBlock({ block }: { block: RiskNoticeBlockValue }) {
  return (
    <Alert severity={SEVERITY[block.level]}>
      <AlertTitle>{block.title ?? '风险提示'}</AlertTitle>
      {block.text}
      <DataProvenance provenance={block.provenance} />
    </Alert>
  );
}
