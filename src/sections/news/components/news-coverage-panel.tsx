import type { NewsFeedCoverage, NewsCoverageResponse } from 'src/api/news';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { formatNewsDataThrough } from '../news-time';

export type NewsCoveragePanelProps = {
  coverage: NewsCoverageResponse | null;
  error: unknown | null;
};

const STATUS_LABEL = { READY: '正常', DEGRADED: '降级', DISABLED: '已停用' } as const;
const STATUS_COLOR = { READY: 'success', DEGRADED: 'warning', DISABLED: 'default' } as const;
const STATUS_ORDER = { DEGRADED: 0, READY: 1, DISABLED: 2 } as const;

export function NewsCoveragePanel({ coverage, error }: NewsCoveragePanelProps) {
  if (error) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">数据覆盖</Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            状态暂不可用
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!coverage) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">数据覆盖</Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            正在读取覆盖状态…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const feeds = [...coverage.feeds].sort(
    (left, right) =>
      STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
      left.feedDisplayName.localeCompare(right.feedDisplayName)
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="h6">数据覆盖</Typography>
          <Chip
            size="small"
            label={STATUS_LABEL[coverage.overallStatus]}
            color={STATUS_COLOR[coverage.overallStatus]}
            variant="outlined"
          />
        </Stack>
        <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
          {formatNewsDataThrough(coverage.dataThrough).text}
        </Typography>

        <Stack divider={<Divider flexItem />} spacing={1.5} sx={{ mt: 2 }}>
          {feeds.map((feed) => (
            <FeedStatus key={`${feed.providerKey}:${feed.feedKey}`} feed={feed} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function FeedStatus({ feed }: { feed: NewsFeedCoverage }) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
        <Typography variant="subtitle2">{feed.feedDisplayName}</Typography>
        <Chip
          size="small"
          label={STATUS_LABEL[feed.status]}
          color={STATUS_COLOR[feed.status]}
          variant="outlined"
        />
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {feed.providerDisplayName} · {feed.requiredForCompleteness ? '完整性必需' : '可选来源'} ·{' '}
        {feed.scheduleMode === 'ON_DEMAND' ? '按需' : formatNewsDataThrough(feed.dataThrough).text}
      </Typography>
      {feed.publicReason ? <Typography variant="body2">{feed.publicReason}</Typography> : null}
      {feed.potentiallyTruncated ? (
        <Typography variant="body2" sx={{ color: 'warning.main' }}>
          本窗口可能截断
        </Typography>
      ) : null}
    </Stack>
  );
}
