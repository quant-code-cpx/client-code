import type { SignalActivationItem } from 'src/api/signal';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  activation: SignalActivationItem;
  selected: boolean;
  onClick: () => void;
};

export function SignalActivationCard({ activation, selected, onClick }: Props) {
  const isActive = activation.isActive;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    if (dateStr.length === 8) {
      return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
    }
    return dateStr.slice(0, 10);
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2.5,
        cursor: 'pointer',
        border: (theme) =>
          `2px solid ${selected ? theme.vars.palette.primary.main : 'transparent'}`,
        transition: 'border-color 0.2s',
        '&:hover': {
          borderColor: (theme) => theme.vars.palette.primary.light,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" noWrap sx={{ maxWidth: 160 }}>
          {activation.strategyName}
        </Typography>

        <Label color={isActive ? 'success' : 'default'} variant="soft">
          {isActive ? '活跃' : '已停用'}
        </Label>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          最新信号：{formatDate(activation.lastSignalDate)}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          关联组合：{activation.portfolioId ? `${activation.portfolioId.slice(0, 8)}...` : '无'}
        </Typography>
      </Box>
    </Card>
  );
}
