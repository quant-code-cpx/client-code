import type { FactorDef, FactorStatus } from 'src/api/factor';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import CircularProgress from '@mui/material/CircularProgress';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { deriveStatus, getStatusMeta, SOURCE_LABELS, CATEGORY_LABELS } from '../constants';

// ----------------------------------------------------------------------

type Props = {
  factor: FactorDef;
  selected: boolean;
  onToggleSelect: (factor: FactorDef) => void;
  onOpenDetail: (factor: FactorDef) => void;
  onEdit?: (factor: FactorDef) => void;
  onDelete?: (factor: FactorDef) => void;
  onPrecompute?: (factor: FactorDef) => void;
  onToggleEnabled?: (factor: FactorDef, next: boolean) => void;
  precomputing?: boolean;
};

const fmtNum = (v: number | null | undefined, digits = 2): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);

const fmtPercent = (v: number | null | undefined): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(0)}%`;

const fmtDate = (v: string | null | undefined): string => {
  if (!v) return '—';
  // YYYYMMDD or ISO
  if (/^\d{8}$/.test(v)) return `${v.slice(4, 6)}-${v.slice(6, 8)}`;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function FactorLibraryCardV2({
  factor,
  selected,
  onToggleSelect,
  onOpenDetail,
  onEdit,
  onDelete,
  onPrecompute,
  onToggleEnabled,
  precomputing,
}: Props) {
  const theme = useTheme();
  const isCustom = !factor.isBuiltin;

  const status: FactorStatus = useMemo(
    () =>
      factor.status ??
      deriveStatus({
        isEnabled: factor.isEnabled,
        lastComputeDate: factor.summary?.lastComputeDate,
        latencyDays: factor.summary?.latencyDays,
      }),
    [factor]
  );

  const statusMeta = getStatusMeta(status);
  const statusColor =
    statusMeta.color === 'default'
      ? theme.palette.text.disabled
      : theme.palette[statusMeta.color].main;

  const summary = factor.summary;

  return (
    <Card
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: theme.transitions.create('box-shadow', { duration: 200 }),
        outline: selected ? `2px solid ${theme.palette.primary.main}` : 'none',
        outlineOffset: -2,
        '&:hover, &:focus-within': {
          boxShadow: theme.customShadows?.z16 ?? theme.shadows[8],
        },
        '& .factor-card-main-link:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2,
        },
        '&:hover .factor-card-actions, &:focus-within .factor-card-actions': {
          opacity: 1,
          pointerEvents: 'auto',
        },
        '&:hover .factor-card-checkbox, &:focus-within .factor-card-checkbox': {
          opacity: 1,
        },
      }}
    >
      {/* 顶部一行：Checkbox + 状态徽标 + 详情按钮 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          pt: 1,
        }}
      >
        <Box
          className="factor-card-checkbox"
          sx={{
            opacity: selected ? 1 : 0,
            transition: theme.transitions.create('opacity', { duration: 200 }),
          }}
        >
          <Checkbox
            size="small"
            checked={selected}
            onChange={() => onToggleSelect(factor)}
            slotProps={{ input: { 'aria-label': `选择因子 ${factor.label}` } }}
            sx={{ p: 0.5 }}
          />
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip
            title={
              <Box>
                <Typography variant="caption">{statusMeta.label}</Typography>
                {summary?.lastComputeDate && (
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    最近预计算 {fmtDate(summary.lastComputeDate)}
                    {summary.latencyDays !== undefined && summary.latencyDays !== null
                      ? `（滞后 ${summary.latencyDays} 天）`
                      : ''}
                  </Typography>
                )}
              </Box>
            }
          >
            <Box
              role="img"
              aria-label={`状态：${statusMeta.label}`}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: statusColor,
                outline: '1px solid',
                outlineColor: 'background.paper',
              }}
            />
          </Tooltip>

          <Tooltip title="查看详情">
            <IconButton
              size="small"
              aria-label="查看详情"
              onClick={() => onOpenDetail(factor)}
              sx={{ p: 0.25 }}
            >
              <Iconify icon="solar:info-circle-bold" width={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <CardActionArea
        className="factor-card-main-link"
        component={RouterLink}
        href={`/factor/detail/${factor.name}`}
        aria-label={`查看因子 ${factor.label} 的详情`}
        sx={{ display: 'block', flex: 1, textAlign: 'left' }}
      >
        <CardContent sx={{ pt: 0.5, pb: 1.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ fontFamily: 'monospace', fontSize: 12 }}
          >
            {factor.name}
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{ mb: 1, lineHeight: 1.3, fontSize: 16, fontWeight: 600 }}
          >
            {factor.label}
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ mb: 1.25, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip
              size="small"
              label={CATEGORY_LABELS[factor.category]}
              color="primary"
              variant="outlined"
            />
            <Chip
              size="small"
              label={SOURCE_LABELS[factor.sourceType]}
              color="default"
              variant="outlined"
            />
            {isCustom && factor.isEnabled === false && (
              <Chip size="small" label="已禁用" color="default" variant="filled" />
            )}
          </Stack>

          {/* 质量指标 4 列 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0.5,
              py: 1,
              borderTop: '1px dashed',
              borderBottom: '1px dashed',
              borderColor: 'divider',
              fontFeatureSettings: '"tnum"',
            }}
          >
            <MetricCell label="IC 10d" value={fmtNum(summary?.ic10d, 3)} />
            <MetricCell label="IR" value={fmtNum(summary?.ir, 2)} />
            <MetricCell label="覆盖" value={fmtPercent(summary?.coverage)} />
            <MetricCell label="最近" value={fmtDate(summary?.lastComputeDate)} />
          </Box>

          {factor.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                fontSize: 12,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {factor.description}
            </Typography>
          )}

          {factor.usageCount !== undefined && factor.usageCount > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: 'block' }}
            >
              被引用 {factor.usageCount} 次
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      {/* 自定义因子操作浮条（hover 时显现） */}
      {isCustom && (onEdit || onDelete || onPrecompute || onToggleEnabled) && (
        <Box
          className="factor-card-actions"
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 0.25,
            px: 1,
            py: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            opacity: 0,
            pointerEvents: 'none',
            transition: theme.transitions.create('opacity', { duration: 200 }),
          }}
        >
          {precomputing && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
              <CircularProgress size={14} />
            </Box>
          )}
          {onPrecompute && (
            <Tooltip title="触发预计算">
              <IconButton
                size="small"
                aria-label="触发预计算"
                disabled={precomputing === true}
                onClick={() => onPrecompute(factor)}
              >
                <Iconify icon="solar:refresh-bold" width={16} />
              </IconButton>
            </Tooltip>
          )}
          {onToggleEnabled && factor.isEnabled !== undefined && (
            <Tooltip title={factor.isEnabled ? '禁用' : '启用'}>
              <IconButton size="small" aria-label={factor.isEnabled ? '禁用' : '启用'} onClick={() => onToggleEnabled(factor, !factor.isEnabled)}>
                <Iconify
                  icon={factor.isEnabled ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                  width={16}
                />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="编辑">
              <IconButton size="small" aria-label="编辑" onClick={() => onEdit(factor)}>
                <Iconify icon="solar:pen-bold" width={16} />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="删除">
              <IconButton size="small" aria-label="删除" color="error" onClick={() => onDelete(factor)}>
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', fontSize: 12, lineHeight: 1.2 }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        color="text.primary"
        sx={{ display: 'block', fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}
      >
        {value}
      </Typography>
    </Box>
  );
}
