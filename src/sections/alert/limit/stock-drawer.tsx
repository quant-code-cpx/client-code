import type { LimitListItem } from 'src/api/alert';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ColoredNumber } from 'src/components/colored-number';

import {
  getStreakDays,
  resolvePctChgLimit,
  SEAL_PATTERN_LABEL,
  formatFirstSealTime,
  STREAK_STATUS_LABEL,
} from './utils/limit-glossary';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  item: LimitListItem | null;
  onClose: () => void;
  onCreateAlert?: (item: LimitListItem) => void;
};

export function AlertLimitStockDrawer({ open, item, onClose, onCreateAlert }: Props) {
  const theme = useTheme();
  const router = useRouter();

  if (!item) {
    return (
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box sx={{ width: 480, p: 3 }}>
          <Typography color="text.secondary">未选择股票</Typography>
        </Box>
      </Drawer>
    );
  }

  const streakDays = getStreakDays(item);
  const limit = resolvePctChgLimit(item);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 480, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
          <Box>
            <Typography variant="h6">{item.stockName}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {item.tsCode}
              {item.industry ? ` · ${item.industry}` : ''}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="solar:close-circle-bold" />
          </IconButton>
        </Stack>
        <Divider />

        {/* Body */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* 关键指标 */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                类型
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Label color={item.limitType === 'UP' ? 'error' : 'success'}>
                  {item.limitType === 'UP' ? '涨停' : '跌停'} · {limit}cm
                </Label>
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                涨跌幅
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <ColoredNumber value={item.pctChg} format="percent" decimals={2} />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                收盘价
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 0.5, fontFeatureSettings: '"tnum"', color: theme.palette.text.primary }}
              >
                {item.close.toFixed(2)}
              </Typography>
            </Box>
          </Stack>

          {/* 连板 / 形态 */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Label color={streakDays >= 3 ? 'warning' : 'default'} variant="filled">
              {item.limitType === 'UP' ? `${streakDays} 连板` : `${streakDays} 连续跌停`}
            </Label>
            {item.streakStatus ? (
              <Label variant="outlined">{STREAK_STATUS_LABEL[item.streakStatus]}</Label>
            ) : null}
            {item.sealPattern ? (
              <Label variant="outlined">{SEAL_PATTERN_LABEL[item.sealPattern]}</Label>
            ) : null}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 封板细节 */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            封板细节
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                首封时间
              </Typography>
              <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
                {formatFirstSealTime(item.firstSealTime)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                末封时间
              </Typography>
              <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
                {item.lastSealTime ?? '—'}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                封板次数
              </Typography>
              <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
                {item.sealCount}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                封单额
              </Typography>
              <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
                {fNumber(Math.round(item.sealAmount))} 万
                {item.sealRatio != null ? ` · 占流通 ${fPercent(item.sealRatio * 100)}` : ''}
              </Typography>
            </Stack>
            {item.recentLimitCount60d != null ? (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  近 60 日涨停次数
                </Typography>
                <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
                  {item.recentLimitCount60d}
                </Typography>
              </Stack>
            ) : null}
          </Stack>

          {item.concepts && item.concepts.length > 0 ? (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                关联概念
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {item.concepts.map((c) => (
                  <Chip key={c} label={c} size="small" variant="outlined" />
                ))}
              </Box>
            </>
          ) : null}
        </Box>

        {/* Footer */}
        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:bell-bold" />}
            onClick={() => onCreateAlert?.(item)}
          >
            创建预警
          </Button>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:graph-up-bold" />}
            onClick={() => router.push(`/stock/detail?code=${item.tsCode}`)}
          >
            查看详情
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
