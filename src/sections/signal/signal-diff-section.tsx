import type { IconifyName } from 'src/components/iconify/register-icons';
import type { TradingSignalItem, SignalDiffFromPrev } from 'src/api/signal';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import { useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  diff: SignalDiffFromPrev | null | undefined;
  /** true = 后端兜底数据未就绪，前端用今日 vs 昨日两次请求合成 */
  fallback?: boolean;
};

export function SignalDiffSection({ diff, fallback }: Props) {
  const theme = useTheme();
  const [openAdded, setOpenAdded] = useState(true);
  const [openRemoved, setOpenRemoved] = useState(false);
  const [openRebalanced, setOpenRebalanced] = useState(false);

  if (!diff) {
    return (
      <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:info-circle-bold" width={20} sx={{ color: 'info.main' }} />
          <Typography variant="subtitle2">首次跑批，无对照</Typography>
          <Typography variant="caption" color="text.secondary">
            该策略尚无上一交易日数据，无法进行 diff 对比
          </Typography>
        </Stack>
      </Card>
    );
  }

  const addedCount = diff.added.length;
  const removedCount = diff.removed.length;
  const rebalancedCount = diff.rebalanced.length;
  const totalDiff = addedCount + removedCount + rebalancedCount;

  return (
    <Card variant="outlined" sx={{ p: 2.5, mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <Iconify icon="solar:restart-bold" width={20} sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle1">今日变化 vs {fmtTradeDate(diff.prevTradeDate)}</Typography>
        {fallback ? (
          <Label color="warning" variant="soft">
            前端兜底
          </Label>
        ) : null}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          总计 {totalDiff} 项
        </Typography>
      </Stack>

      {totalDiff === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
          与上一交易日完全一致，无新进 / 退出 / 调仓
        </Typography>
      ) : (
        <Stack spacing={1}>
          <DiffGroup
            title="新进"
            count={addedCount}
            colorChannel={theme.vars.palette.success.mainChannel}
            open={openAdded}
            onToggle={() => setOpenAdded(!openAdded)}
            icon="solar:check-circle-bold"
          >
            {diff.added.map((item) => (
              <DiffRow key={item.tsCode} item={item} variant="added" />
            ))}
          </DiffGroup>

          <DiffGroup
            title="退出"
            count={removedCount}
            colorChannel={theme.vars.palette.error.mainChannel}
            open={openRemoved}
            onToggle={() => setOpenRemoved(!openRemoved)}
            icon="solar:close-circle-bold"
          >
            {diff.removed.map((item) => (
              <DiffRow key={item.tsCode} item={item} variant="removed" />
            ))}
          </DiffGroup>

          <DiffGroup
            title="调仓"
            count={rebalancedCount}
            colorChannel={theme.vars.palette.warning.mainChannel}
            open={openRebalanced}
            onToggle={() => setOpenRebalanced(!openRebalanced)}
            icon="solar:refresh-bold"
          >
            {diff.rebalanced.map((item) => (
              <Box
                key={item.tsCode}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.75,
                  px: 1,
                  borderRadius: 0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 96 }}>
                  {item.tsCode}
                </Typography>
                <Typography variant="body2" sx={{ minWidth: 96 }}>
                  {item.stockName}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontFeatureSettings: '"tnum"' }}
                >
                  {(item.prevWeight * 100).toFixed(1)}% → {(item.newWeight * 100).toFixed(1)}%
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFeatureSettings: '"tnum"',
                    color: item.delta >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 600,
                  }}
                >
                  ({item.delta >= 0 ? '+' : ''}
                  {(item.delta * 100).toFixed(1)}%)
                </Typography>
              </Box>
            ))}
          </DiffGroup>
        </Stack>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

type DiffGroupProps = {
  title: string;
  count: number;
  colorChannel: string;
  open: boolean;
  onToggle: () => void;
  icon: IconifyName;
  children: React.ReactNode;
};

function DiffGroup({ title, count, colorChannel, open, onToggle, icon, children }: DiffGroupProps) {
  if (count === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.5 }}>
        <Iconify icon={icon} width={16} />
        <Typography variant="body2">{title}：0 项</Typography>
      </Box>
    );
  }
  return (
    <Box>
      <ButtonBase
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${open ? '收起' : '展开'}${title}`}
        sx={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'flex-start',
          textAlign: 'left',
          gap: 1,
          py: 0.5,
          px: 1,
          borderRadius: 0.5,
          bgcolor: varAlpha(colorChannel, 0.06),
          '&:hover': { bgcolor: varAlpha(colorChannel, 0.12) },
        }}
      >
        <Iconify icon={icon} width={16} />
        <Typography variant="subtitle2">
          {title}（{count}）
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Iconify icon={open ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} width={16} />
      </ButtonBase>
      <Collapse in={open}>
        <Box sx={{ pt: 0.5, pl: 1 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

// ----------------------------------------------------------------------

function DiffRow({ item, variant }: { item: TradingSignalItem; variant: 'added' | 'removed' }) {
  const sign = variant === 'added' ? '＋' : '－';
  const color = variant === 'added' ? 'success.main' : 'error.main';
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.75,
        px: 1,
        borderRadius: 0.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Typography variant="body2" sx={{ color, fontWeight: 700, minWidth: 16 }}>
        {sign}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 96 }}>
        {item.tsCode}
      </Typography>
      <Typography variant="body2" sx={{ minWidth: 96 }}>
        {item.stockName}
      </Typography>
      {item.targetWeight != null ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontFeatureSettings: '"tnum"' }}>
          目标 {(item.targetWeight * 100).toFixed(1)}%
        </Typography>
      ) : null}
      {item.estimatedShares != null ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontFeatureSettings: '"tnum"' }}>
          · 估手 {Math.abs(item.estimatedShares)}
        </Typography>
      ) : null}
    </Box>
  );
}
