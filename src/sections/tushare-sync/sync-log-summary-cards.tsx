import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

type Props = {
  loading: boolean;
  hasError: boolean;
  hasSnapshot: boolean;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  warningCount: number;
};

export function SyncLogSummaryCards({
  loading,
  hasError,
  hasSnapshot,
  successCount,
  failedCount,
  skippedCount,
  warningCount,
}: Props) {
  const cards = [
    { label: '成功任务数', value: successCount, color: 'success.main' },
    { label: '失败任务数', value: failedCount, color: 'error.main' },
    { label: '跳过任务数', value: skippedCount, color: 'warning.main' },
    { label: '连续失败告警', value: warningCount, color: 'error.dark' },
  ];

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
      {cards.map((card) => (
        <Card key={card.label} sx={{ p: 2, flex: '1 1 180px', minWidth: 160 }}>
          {loading && !hasSnapshot ? (
            <Skeleton variant="rectangular" height={56} />
          ) : (
            <Box>
              <Typography variant="h5" sx={{ color: card.color }}>
                {hasError && !hasSnapshot ? '—' : card.value}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {card.label}
              </Typography>
            </Box>
          )}
        </Card>
      ))}
    </Stack>
  );
}
