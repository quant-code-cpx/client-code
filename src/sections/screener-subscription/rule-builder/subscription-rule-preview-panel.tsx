import type { SubscriptionPreviewResult } from 'src/api/screener-subscription';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fmtTradeDate } from 'src/utils/format-time';

import { SubscriptionHitEvidenceTable } from '../subscription-hit-evidence';

// ----------------------------------------------------------------------

type Props = {
  preview: SubscriptionPreviewResult | null;
  loading: boolean;
  disabled: boolean;
  onPreview: () => void;
};

export function SubscriptionRulePreviewPanel({ preview, loading, disabled, onPreview }: Props) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                规则预览
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                预览只读取后端同一评估器，不写入订阅状态，也不发送通知。
              </Typography>
            </Box>
            <Button variant="outlined" onClick={onPreview} disabled={loading || disabled}>
              {loading ? '预览中…' : '运行预览'}
            </Button>
          </Box>
          {loading ? <Skeleton variant="rounded" height={220} /> : null}
          {!loading && !preview ? (
            <Alert severity="info">完成规则条件后运行预览；数据未就绪不会被显示为 0 命中。</Alert>
          ) : null}
          {!loading && preview ? <RulePreview preview={preview} /> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function RulePreview({ preview }: { preview: SubscriptionPreviewResult }) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        <Typography variant="body2">
          数据日期：<strong>{fmtTradeDate(preview.asOfTradeDate)}</strong>
        </Typography>
        <Typography variant="body2">
          样本：<strong>{preview.universeCount}</strong>
        </Typography>
        <Typography variant="body2">
          命中：<strong>{preview.matchedCount}</strong>
        </Typography>
        <Typography variant="body2">
          耗时：<strong>{preview.executionMs}ms</strong>
        </Typography>
      </Stack>
      {preview.warnings.map((warning) => (
        <Alert key={warning.code} severity="warning">
          {warning.message}
        </Alert>
      ))}
      {preview.truncated ? (
        <Alert severity="info">仅展示前 {preview.matchedStocks.length} 条；命中总数未截断。</Alert>
      ) : null}
      <SubscriptionHitEvidenceTable evidence={preview.evidence} />
    </Stack>
  );
}
