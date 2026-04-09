import type { Strategy } from 'src/api/strategy';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { STRATEGY_TYPE_COLOR, STRATEGY_TYPE_LABEL } from './constants';

// ----------------------------------------------------------------------

interface StrategyDetailHeaderProps {
  strategy: Strategy;
  onClone: () => void;
  onDelete: () => void;
}

export function StrategyDetailHeader({ strategy, onClone, onDelete }: StrategyDetailHeaderProps) {
  const typeColor = STRATEGY_TYPE_COLOR[strategy.strategyType] ?? 'default';
  const typeLabel = STRATEGY_TYPE_LABEL[strategy.strategyType] ?? strategy.strategyType;

  return (
    <Box>
      {/* Back link */}
      <Button
        component={RouterLink}
        href="/strategy"
        startIcon={<Iconify icon="solar:arrow-left-bold" />}
        color="inherit"
        size="small"
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        返回策略列表
      </Button>

      {/* Title row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 1,
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" noWrap>
              {strategy.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              v{strategy.version}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
            <Label color={typeColor} variant="soft">
              {typeLabel}
            </Label>

            {strategy.isPublic ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="solar:earth-bold" width={14} sx={{ color: 'info.main' }} />
                <Typography variant="caption" sx={{ color: 'info.main' }}>
                  公开
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Iconify icon="solar:lock-bold" width={14} sx={{ color: 'text.disabled' }} />
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  私有
                </Typography>
              </Box>
            )}

            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              更新于 {fToNow(strategy.updatedAt)}
            </Typography>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:copy-bold" />}
            onClick={onClone}
          >
            克隆
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={onDelete}
          >
            删除
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
