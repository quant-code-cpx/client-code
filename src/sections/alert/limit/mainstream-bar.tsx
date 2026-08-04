import type { LimitListItem } from 'src/api/alert';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
  items: LimitListItem[];
  /** 显示前 N 个，默认 10 */
  topN?: number;
  /** 类型筛选回调（点击行业条） */
  onIndustryClick?: (industry: string) => void;
};

type Counter = { name: string; up: number };

function countByIndustry(items: LimitListItem[]): Counter[] {
  const map = new Map<string, Counter>();
  items.forEach((it) => {
    if (it.limitType !== 'UP') return;
    const name = it.industry ?? '';
    if (!name) return;
    const cur = map.get(name) ?? { name, up: 0 };
    cur.up += 1;
    map.set(name, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.up - a.up);
}

export function AlertLimitMainstreamBar({ items, topN = 10, onIndustryClick }: Props) {
  const theme = useTheme();

  const data = useMemo(() => countByIndustry(items).slice(0, topN), [items, topN]);
  const max = data.reduce((m, d) => Math.max(m, d.up), 1);

  // 数据缺失（后端 BE-1 未上线）
  const hasIndustry = items.some((it) => it.industry);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">题材主线 Top {topN}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            按今日封板家数排序
          </Typography>
        </Stack>

        {!hasIndustry ? (
          <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
            等待后端字段：industry
          </Typography>
        ) : data.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
            今日无封板个股
          </Typography>
        ) : (
          <Stack spacing={1}>
            {data.map((row) => {
              const total = row.up;
              const upWidth = (row.up / max) * 100;
              return (
                <Box
                  key={row.name}
                  sx={{
                    cursor: onIndustryClick ? 'pointer' : 'default',
                    '&:hover .industry-name': onIndustryClick ? { color: 'primary.main' } : {},
                  }}
                  onClick={() => onIndustryClick?.(row.name)}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      variant="caption"
                      className="industry-name"
                      sx={{ color: 'text.primary', transition: 'color 200ms' }}
                    >
                      {row.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontFeatureSettings: '"tnum"',
                      }}
                    >
                      {fNumber(total)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ height: 8, borderRadius: 0.5, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        width: `${upWidth}%`,
                        bgcolor: theme.vars.palette.error.main,
                      }}
                    />
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
