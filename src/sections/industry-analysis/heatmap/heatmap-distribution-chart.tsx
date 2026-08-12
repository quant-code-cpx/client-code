import type { HeatmapDistribution } from 'src/api/heatmap';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import { useTheme } from '@mui/material/styles';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  distribution: HeatmapDistribution | null;
  loading: boolean;
  error: string;
};

function parseRangeMin(range: string): number {
  return Number(range.split('~')[0]);
}

export function HeatmapDistributionChart({ distribution, loading, error }: Props) {
  const theme = useTheme();
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const ranges = distribution ? [...distribution.ranges].sort((a, b) => parseRangeMin(a.range) - parseRangeMin(b.range)) : [];
  const totalStocks = ranges.reduce((total, range) => total + range.count, 0);
  const maxBucketCount = Math.max(...ranges.map((range) => range.count), 1);

  const getBucketColor = (range: string) => {
    const minVal = parseRangeMin(range);
    if (minVal < 0) return minVal <= -5 ? theme.vars.palette.success.dark : theme.vars.palette.success.main;
    if (minVal > 0) return minVal >= 5 ? theme.vars.palette.error.dark : theme.vars.palette.error.main;
    return theme.vars.palette.grey[500];
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6">个股涨跌幅分布</Typography>
          {distribution && (
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              有效 {totalStocks}
            </Typography>
          )}
        </Stack>

        {distribution && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Label sx={{ bgcolor: 'error.dark', color: 'common.white', fontWeight: 700, fontSize: 12 }}>
              涨停 {distribution.limitUp}
            </Label>
            <Label sx={{ bgcolor: 'error.main', color: 'common.white', fontWeight: 700, fontSize: 12 }}>
              上涨 {distribution.upCount}
            </Label>
            <Label sx={{ bgcolor: 'grey.600', color: 'common.white', fontWeight: 700, fontSize: 12 }}>
              平盘 {distribution.flatCount}
            </Label>
            <Label sx={{ bgcolor: 'success.main', color: 'common.white', fontWeight: 700, fontSize: 12 }}>
              下跌 {distribution.downCount}
            </Label>
            <Label sx={{ bgcolor: 'success.dark', color: 'common.white', fontWeight: 700, fontSize: 12 }}>
              跌停 {distribution.limitDown}
            </Label>
            {distribution.missingCount > 0 && (
              <Label variant="outlined" color="default">
                缺失 {distribution.missingCount}
              </Label>
            )}
          </Stack>
        )}

        {loading && <Skeleton variant="rectangular" height={188} sx={{ borderRadius: 1 }} />}

        {!loading && error && (
          <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {!loading && !error && ranges.length > 0 && (
          <Box component="section" aria-label="21档涨跌幅分布" sx={{ mb: 1.5 }}>
            <Box sx={{ position: 'relative', height: 176, pt: 1 }}>
              <Box
                aria-hidden="true"
                sx={{
                  top: 0,
                  bottom: 22,
                  left: '50%',
                  width: '1px',
                  position: 'absolute',
                  bgcolor: 'text.disabled',
                }}
              />
              <Box
                role="list"
                aria-label="21档涨跌幅柱状分布"
                sx={{
                  gap: 0.5,
                  height: 150,
                  display: 'grid',
                  position: 'relative',
                  gridTemplateColumns: 'repeat(21, minmax(0, 1fr))',
                }}
              >
                {ranges.map((range) => {
                  const barHeight = range.count > 0 ? Math.max((range.count / maxBucketCount) * 100, 3) : 0;
                  return (
                    <Box
                      key={range.range}
                      role="listitem"
                      title={`${range.range}%：${range.count} 家`}
                      aria-label={`${range.range}%：${range.count} 家`}
                      sx={{ display: 'flex', minWidth: 0, alignItems: 'flex-end' }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          borderRadius: 0.5,
                          height: `${barHeight}%`,
                          bgcolor: getBucketColor(range.range),
                          transition: 'height 160ms ease',
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ left: 0, bottom: 0, position: 'absolute', fontVariantNumeric: 'tabular-nums' }}
              >
                -10%
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ left: '50%', bottom: 0, position: 'absolute', transform: 'translateX(-50%)' }}
              >
                0
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ right: 0, bottom: 0, position: 'absolute', fontVariantNumeric: 'tabular-nums' }}
              >
                +10%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              负值左侧、正值右侧；涨跌停仅作桶内 KPI，不参与总数二次加总。
            </Typography>
          </Box>
        )}

        {!loading && !error && distribution && ranges.length > 0 && (
          <>
            <Button
              fullWidth
              variant="outlined"
              aria-expanded={detailsExpanded}
              onClick={() => setDetailsExpanded((expanded) => !expanded)}
            >
              {detailsExpanded ? '收起 21 档区间明细' : '展开 21 档区间明细'}
            </Button>

            <Collapse in={detailsExpanded}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                区间明细
              </Typography>
              <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>涨跌幅区间</TableCell>
                      <TableCell align="right">家数</TableCell>
                      <TableCell align="right">占比</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...ranges].reverse().map((range) => {
                      const pct = totalStocks > 0 ? ((range.count / totalStocks) * 100).toFixed(1) : '0.0';
                      return (
                        <TableRow key={range.range} hover>
                          <TableCell sx={{ color: getBucketColor(range.range), fontWeight: 500 }}>
                            {range.range}%
                          </TableCell>
                          <TableCell align="right">{range.count}</TableCell>
                          <TableCell align="right" sx={{ color: 'text.secondary' }}>
                            {pct}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </>
        )}

        {!loading && !error && !distribution && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            暂无数据
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
