import type { PatternSearchResult } from 'src/api/pattern';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { PatternMatchCard } from './pattern-match-card';

type Props = {
  loading: boolean;
  error: string;
  result: PatternSearchResult | null;
  /** 空结果文案 */
  emptyMessage?: string;
};

export function PatternResultsList({
  loading,
  error,
  result,
  emptyMessage = '未找到匹配，请调整参数后重试。',
}: Props) {
  if (error) return <Alert severity="error">{error}</Alert>;

  if (loading) {
    return (
      <Stack spacing={1.5}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: 1.5 }} />
        ))}
      </Stack>
    );
  }

  if (!result) return null;

  if (result.matches.length === 0) {
    return <Alert severity="info">{emptyMessage}</Alert>;
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary">
        共 {result.matches.length} 条匹配 · 候选池 {result.candidateCount} 只 · 形态长度{' '}
        {result.patternLength} 日 · 算法 {result.algorithm} · 耗时 {result.elapsedMs}ms
      </Typography>
      {result.matches.map((m, i) => (
        <PatternMatchCard key={`${m.tsCode}-${m.startDate}-${i}`} match={m} />
      ))}
    </Stack>
  );
}
