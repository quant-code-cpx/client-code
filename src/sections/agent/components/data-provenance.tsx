import type { DataProvenance } from 'src/types/agent/generated';

import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

const SOURCE_LABELS: Record<DataProvenance['sourceType'], string> = {
  DATABASE: '数据库',
  PROGRAM_CALCULATION: '程序计算',
  OFFICIAL: '官方来源',
  MEDIA: '媒体',
  INSTITUTION: '机构',
  MODEL_INFERENCE: '模型推断',
};

const ADJUSTMENT_LABELS: Record<NonNullable<DataProvenance['adjustment']>, string> = {
  NONE: '不复权',
  FORWARD: '前复权',
  BACKWARD: '后复权',
};

type DataProvenanceProps = {
  provenance: DataProvenance;
};

function asOfLabel(provenance: DataProvenance): string {
  const { asOf } = provenance;
  if (asOf.tradeDate) return `交易日 ${asOf.tradeDate}`;
  if (asOf.reportPeriod) return `报告期 ${asOf.reportPeriod}`;
  if (asOf.availableAt) return `可用时点 ${fDateTime(asOf.availableAt)}`;
  return `获取于 ${fDateTime(asOf.retrievedAt)}`;
}

export function DataProvenance({ provenance }: DataProvenanceProps) {
  return (
    <Stack
      component="footer"
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{ mt: 1.5, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        数据口径
      </Typography>
      <Label variant="soft" color="info">
        {SOURCE_LABELS[provenance.sourceType]}
      </Label>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {asOfLabel(provenance)}
      </Typography>
      <Divider flexItem orientation="vertical" />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {provenance.timezone}
      </Typography>
      {provenance.currency ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          币种 {provenance.currency}
        </Typography>
      ) : null}
      {provenance.unit ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          单位 {provenance.unit}
        </Typography>
      ) : null}
      {provenance.scale ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          比例口径 {provenance.scale}
        </Typography>
      ) : null}
      {provenance.adjustment ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {ADJUSTMENT_LABELS[provenance.adjustment]}
        </Typography>
      ) : null}
      {provenance.qualityFlags?.map((flag) => (
        <Label key={flag} variant="soft" color="warning">
          {flag}
        </Label>
      ))}
    </Stack>
  );
}
