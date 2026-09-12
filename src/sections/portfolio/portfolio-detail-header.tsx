import type { PortfolioDetail } from 'src/api/portfolio';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PortfolioDetailHeaderProps {
  detail: PortfolioDetail;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateReport?: () => void;
}

export function PortfolioDetailHeader({
  detail,
  onEdit,
  onDelete,
  onGenerateReport,
}: PortfolioDetailHeaderProps) {
  const router = useRouter();
  const { portfolio } = detail;

  return (
    <Box sx={{ mb: 3 }}>
      <Button
        startIcon={<Iconify icon="solar:arrow-left-bold" />}
        onClick={() => router.push('/portfolio')}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        返回列表
      </Button>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h4">{portfolio.name}</Typography>
            <Label color="info" variant="soft">
              研究模式
            </Label>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
            仅用于模拟记账与研究，不连接券商、不会发送实盘订单
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              初始资金：{fCurrency(portfolio.initialCash)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              持仓：{detail.holdings.length} 只
            </Typography>
            <Typography variant="body2" color="text.secondary">
              创建时间：{fDate(portfolio.createdAt, 'YYYY-MM-DD')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onGenerateReport && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={onGenerateReport}
              startIcon={<Iconify icon="solar:file-text-bold" />}
            >
              生成报告
            </Button>
          )}
          <Tooltip title="编辑组合">
            <IconButton onClick={onEdit} aria-label="编辑组合">
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Tooltip>
          <Tooltip title="删除组合">
            <IconButton onClick={onDelete} color="error" aria-label="删除组合">
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
