import type { FactorCategory, FactorDef } from 'src/api/factor';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

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
};

export function FactorLibraryCard({ factor }: FactorLibraryCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <Card
      elevation={hovered ? 8 : 1}
      sx={{ transition: 'box-shadow 0.2s', height: '100%' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardActionArea
        onClick={() => navigate(`/factor/detail/${factor.name}`)}
        sx={{ height: '100%' }}
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
          </Box>

          {factor.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {factor.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
