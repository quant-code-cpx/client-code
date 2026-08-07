import type { DataProvenance } from 'src/types/agent/generated';

import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import { sourceTypeLabel } from '../lib/evidence-display';

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

function timezoneLabel(timezone: string): string {
  if (timezone === 'Asia/Shanghai') return '中国标准时间';
  if (timezone === 'UTC') return '协调世界时';
  return timezone;
}

function qualitySummary(qualityFlags: string[] | undefined): string | null {
  if (!qualityFlags?.length) return null;
  if (qualityFlags.every((flag) => /^WORKFLOW_WARNING_\d+$/.test(flag))) {
    return '数据提示：本回答包含数据限制，具体说明见正文“数据限制”。';
  }
  if (qualityFlags.length === 1) return qualityFlags[0];
  return `数据提示：本回答有 ${qualityFlags.length} 项数据限制，具体说明见正文“数据限制”。`;
}

export function DataProvenance({ provenance }: DataProvenanceProps) {
  const quality = qualitySummary(provenance.qualityFlags);

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
        {sourceTypeLabel(provenance.sourceType)}
      </Label>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {asOfLabel(provenance)}
      </Typography>
      <Divider flexItem orientation="vertical" />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        时区 {timezoneLabel(provenance.timezone)}
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
      {quality ? (
        <Typography variant="caption" sx={{ color: 'warning.dark' }}>
          {quality}
        </Typography>
      ) : null}
    </Stack>
  );
}
