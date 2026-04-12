import type { FactorDef, FactorCategory } from 'src/api/factor';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const CATEGORY_LABELS: Record<FactorCategory | 'ALL', string> = {
  ALL: '全部',
  VALUATION: '估值',
  SIZE: '规模',
  MOMENTUM: '动量',
  VOLATILITY: '波动率',
  LIQUIDITY: '流动性',
  QUALITY: '质量',
  GROWTH: '成长',
  CAPITAL_FLOW: '资金流',
  LEVERAGE: '杠杆',
  DIVIDEND: '红利',
  TECHNICAL: '技术',
  CUSTOM: '自定义',
};

// ----------------------------------------------------------------------

type FactorLibraryCardProps = {
  factor: FactorDef;
  onEdit?: (factor: FactorDef) => void;
  onDelete?: (factor: FactorDef) => void;
  onPrecompute?: (factor: FactorDef) => void;
};

export function FactorLibraryCard({ factor, onEdit, onDelete, onPrecompute }: FactorLibraryCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const isCustom = !factor.isBuiltin;

  return (
    <Card
      elevation={hovered ? 8 : 1}
      sx={{ transition: 'box-shadow 0.2s', height: '100%', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardActionArea
        onClick={() => navigate(`/factor/detail/${factor.name}`)}
        sx={{ flex: 1 }}
      >
        <CardContent>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            {factor.name}
          </Typography>

          <Typography variant="h6" sx={{ mb: 1.5, lineHeight: 1.3 }}>
            {factor.label}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={CATEGORY_LABELS[factor.category]}
              color="primary"
              variant="outlined"
            />
            {factor.isBuiltin && (
              <Chip size="small" label="内置" color="default" variant="outlined" />
            )}
            {isCustom && (
              <Chip size="small" label="自定义" color="warning" variant="outlined" />
            )}
          </Box>

          {factor.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {factor.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      {/* Custom factor action buttons */}
      {isCustom && (onEdit || onDelete || onPrecompute) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            px: 1,
            pb: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {onPrecompute && (
            <Tooltip title="触发预计算">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onPrecompute(factor); }}
              >
                <Iconify icon="solar:refresh-bold" width={16} />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="编辑">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onEdit(factor); }}
              >
                <Iconify icon="solar:pen-bold" width={16} />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="删除">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); onDelete(factor); }}
              >
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Card>
  );
}
