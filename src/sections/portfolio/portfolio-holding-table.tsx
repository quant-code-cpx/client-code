import type { HoldingDetailItem } from 'src/api/portfolio';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { TableEmptyRow } from 'src/components/empty-content';
import { ColoredNumber } from 'src/components/colored-number';

// ----------------------------------------------------------------------

interface PortfolioHoldingTableProps {
  holdings: HoldingDetailItem[];
  onEdit: (holding: HoldingDetailItem) => void;
  onDelete: (holding: HoldingDetailItem) => void;
}

export function PortfolioHoldingTable({ holdings, onEdit, onDelete }: PortfolioHoldingTableProps) {
  const router = useRouter();

  const handleCopyCode = async (tsCode: string) => {
    try {
      await navigator.clipboard.writeText(tsCode);
    } catch {
      /* ignore clipboard failure */
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>股票代码</TableCell>
            <TableCell>股票名称</TableCell>
            <TableCell align="right">持仓数量</TableCell>
            <TableCell align="right">平均成本</TableCell>
            <TableCell align="right">当前价格</TableCell>
            <TableCell align="right">当前市值</TableCell>
            <TableCell align="right">盈亏比例</TableCell>
            <TableCell align="right">仓位权重</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {holdings.map((holding) => {
            const pnlPct = holding.pnlPct === null ? null : holding.pnlPct * 100;
            const weightText =
              holding.weight === null ? '-' : `${(holding.weight * 100).toFixed(2)}%`;

            return (
              <TableRow
                key={holding.id}
                hover
                sx={{ '&:hover .holding-row-actions': { opacity: 1 } }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {holding.tsCode}
                  </Typography>
                </TableCell>
                <TableCell>{holding.stockName}</TableCell>
                <TableCell align="right">{holding.quantity}</TableCell>
                <TableCell align="right">{fCurrency(holding.avgCost)}</TableCell>
                <TableCell align="right">
                  {holding.currentPrice === null ? '-' : fCurrency(holding.currentPrice)}
                </TableCell>
                <TableCell align="right">
                  {holding.marketValue === null ? '-' : fCurrency(holding.marketValue)}
                </TableCell>
                <TableCell align="right">
                  <ColoredNumber value={pnlPct} format="percent" />
                </TableCell>
                <TableCell align="right">{weightText}</TableCell>
                <TableCell align="center">
                  <Stack
                    direction="row"
                    spacing={0.25}
                    justifyContent="center"
                    className="holding-row-actions"
                    sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity 150ms' }}
                  >
                    <Tooltip title="复制代码">
                      <IconButton size="small" onClick={() => handleCopyCode(holding.tsCode)}>
                        <Iconify icon="solar:copy-bold" width={16} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="查看个股详情">
                      <IconButton
                        size="small"
                        onClick={() =>
                          router.push(`/stock/detail?code=${encodeURIComponent(holding.tsCode)}`)
                        }
                      >
                        <Iconify icon="solar:eye-bold" width={16} />
                      </IconButton>
                    </Tooltip>
                    <Button size="small" onClick={() => onEdit(holding)}>
                      编辑
                    </Button>
                    <Button size="small" color="error" onClick={() => onDelete(holding)}>
                      删除
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {holdings.length === 0 && <TableEmptyRow colSpan={9} message="暂无持仓数据" />}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
