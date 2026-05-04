import type { FactorDef, ScreeningItem, FactorCondition } from 'src/api/factor';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  item: ScreeningItem | null;
  conditions: FactorCondition[];
  allFactors: FactorDef[];
  onClose: () => void;
};

const tabularNum = { fontVariantNumeric: 'tabular-nums' as const };

function describeCondition(c: FactorCondition): string {
  switch (c.operator) {
    case 'gt':
      return `> ${c.value ?? '?'}`;
    case 'gte':
      return `>= ${c.value ?? '?'}`;
    case 'lt':
      return `< ${c.value ?? '?'}`;
    case 'lte':
      return `<= ${c.value ?? '?'}`;
    case 'between':
      return `[${c.min ?? '?'}, ${c.max ?? '?'}]`;
    case 'top_pct':
      return `前 ${c.percent ?? '?'}%`;
    case 'bottom_pct':
      return `后 ${c.percent ?? '?'}%`;
    default:
      return c.operator;
  }
}

function checkCondition(c: FactorCondition, value: number | null | undefined): boolean | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  switch (c.operator) {
    case 'gt':
      return typeof c.value === 'number' ? value > c.value : null;
    case 'gte':
      return typeof c.value === 'number' ? value >= c.value : null;
    case 'lt':
      return typeof c.value === 'number' ? value < c.value : null;
    case 'lte':
      return typeof c.value === 'number' ? value <= c.value : null;
    case 'between':
      return typeof c.min === 'number' && typeof c.max === 'number'
        ? value >= c.min && value <= c.max
        : null;
    default:
      return null;
  }
}

export function StockEvidenceDrawer({ open, item, conditions, allFactors, onClose }: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 } } } }}
    >
      {item && (
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Box>
              <Typography variant="h6" sx={tabularNum}>
                {item.name ?? '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', ...tabularNum }}>
                {item.tsCode} · {item.industry ?? '未知行业'}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="关闭">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {item.isSt === true && (
                <Label color="error" variant="soft">
                  ST
                </Label>
              )}
              {item.isSuspended === true && (
                <Label color="warning" variant="soft">
                  停牌
                </Label>
              )}
              {item.market && (
                <Label color="default" variant="soft">
                  {item.market}
                </Label>
              )}
              {item.score !== null && item.score !== undefined && (
                <Label color="primary" variant="soft">
                  综合分 {item.score.toFixed(2)}
                </Label>
              )}
            </Stack>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              入选证据链
            </Typography>

            <Stack spacing={1.5}>
              {conditions
                .filter((c) => c.factorName)
                .map((c, idx) => {
                  const factor = allFactors.find((f) => f.name === c.factorName);
                  const value = item.factors[c.factorName] ?? null;
                  const pct = item.factorPercentiles?.[c.factorName] ?? null;
                  const rank = item.factorRanks?.[c.factorName] ?? null;
                  const passed = checkCondition(c, value);
                  return (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'background.neutral',
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {factor?.label ?? c.factorName}
                        </Typography>
                        <Label
                          color={
                            passed === true ? 'success' : passed === false ? 'error' : 'default'
                          }
                          variant="soft"
                        >
                          {passed === true ? '满足' : passed === false ? '未满足' : '未知'}
                        </Label>
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary', ...tabularNum }}>
                        条件：{describeCondition(c)} · 当前值：
                        {value === null ? '—' : value.toFixed(4)}
                        {pct !== null ? ` · 分位：${(pct * 100).toFixed(1)}%` : ''}
                        {rank !== null ? ` · 排名：#${rank}` : ''}
                      </Typography>
                    </Box>
                  );
                })}
            </Stack>

            {item.warnings && item.warnings.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  数据提示
                </Typography>
                <Stack spacing={0.5}>
                  {item.warnings.map((w, i) => (
                    <Typography key={i} variant="caption" sx={{ color: 'warning.dark' }}>
                      · {w}
                    </Typography>
                  ))}
                </Stack>
              </>
            )}
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: 'divider' }}
          >
            <Button
              fullWidth
              variant="contained"
              component={RouterLink}
              href={`/stock/detail?code=${item.tsCode}`}
            >
              查看股票详情
            </Button>
            <Button fullWidth variant="outlined" onClick={onClose}>
              关闭
            </Button>
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
