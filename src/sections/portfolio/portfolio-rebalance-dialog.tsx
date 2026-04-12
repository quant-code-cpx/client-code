import type { RebalanceAction, RebalancePlanResponse } from 'src/api/portfolio';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { rebalancePlan } from 'src/api/portfolio';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface TargetRow {
  tsCode: string;
  targetWeight: number; // 0~100 (百分比)
}

interface RebalancePlanDialogProps {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
}

const ACTION_LABELS: Record<string, string> = {
  BUY: '买入',
  SELL: '卖出',
  ADJUST: '调整',
  HOLD: '持有',
};

const ACTION_COLOR: Record<
  string,
  'success' | 'error' | 'info' | 'default' | 'warning' | 'primary' | 'secondary'
> = {
  BUY: 'success',
  SELL: 'error',
  ADJUST: 'info',
  HOLD: 'default',
};

function fCurrency(v: number) {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

export function PortfolioRebalanceDialog({ open, onClose, portfolioId }: RebalancePlanDialogProps) {
  const [targets, setTargets] = useState<TargetRow[]>([{ tsCode: '', targetWeight: 0 }]);
  const [result, setResult] = useState<RebalancePlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalWeight = targets.reduce((sum, t) => sum + (t.targetWeight || 0), 0);
  const weightOk = totalWeight > 0 && totalWeight <= 100;

  function addRow() {
    setTargets((prev) => [...prev, { tsCode: '', targetWeight: 0 }]);
  }

  function removeRow(idx: number) {
    setTargets((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, patch: Partial<TargetRow>) {
    setTargets((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function handleClose() {
    setTargets([{ tsCode: '', targetWeight: 0 }]);
    setResult(null);
    setError('');
    onClose();
  }

  const handleGenerate = async () => {
    const validTargets = targets.filter((t) => t.tsCode.trim() && t.targetWeight > 0);
    if (validTargets.length === 0) {
      setError('请至少添加一条有效的目标持仓');
      return;
    }
    if (totalWeight > 100.01) {
      setError('目标权重合计不能超过 100%');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await rebalancePlan({
        portfolioId,
        targets: validTargets.map((t) => ({
          tsCode: t.tsCode.trim().toUpperCase(),
          targetWeight: t.targetWeight / 100,
        })),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成调仓计划失败');
    } finally {
      setLoading(false);
    }
  };

  const actions = result?.actions ?? [];

  return (
    <Dialog open={open} onClose={!loading ? handleClose : undefined} maxWidth="md" fullWidth>
      <DialogTitle>生成调仓计划</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Target weight editor */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              目标持仓权重
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>股票代码</TableCell>
                    <TableCell align="right" sx={{ width: 150 }}>
                      目标权重 (%)
                    </TableCell>
                    <TableCell width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {targets.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="如 000001.SZ"
                          value={row.tsCode}
                          onChange={(e) => updateRow(idx, { tsCode: e.target.value })}
                          disabled={loading}
                          sx={{ width: 160 }}
                          inputProps={{ style: { textTransform: 'uppercase' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={row.targetWeight}
                          onChange={(e) => updateRow(idx, { targetWeight: Number(e.target.value) })}
                          disabled={loading}
                          inputProps={{ min: 0, max: 100, step: 1 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => removeRow(idx)}
                          disabled={loading || targets.length === 1}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}
            >
              <Button
                size="small"
                startIcon={<Iconify icon="solar:add-circle-bold" />}
                onClick={addRow}
                disabled={loading}
              >
                添加行
              </Button>
              <Typography
                variant="caption"
                sx={{
                  color:
                    totalWeight > 100 ? 'error.main' : weightOk ? 'success.main' : 'text.secondary',
                }}
              >
                合计权重：{totalWeight.toFixed(1)}%
              </Typography>
            </Box>
          </Box>

          {/* Results */}
          {result && (
            <>
              <Divider />
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1.5,
                  }}
                >
                  <Typography variant="subtitle2">调仓操作清单</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    预估交易成本：{fCurrency(result.estimatedCost)}
                  </Typography>
                </Box>

                <TableContainer sx={{ maxHeight: 340 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>股票代码</TableCell>
                        <TableCell>名称</TableCell>
                        <TableCell>操作</TableCell>
                        <TableCell align="right">变化数量</TableCell>
                        <TableCell align="right">目标数量</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {actions.map((action: RebalanceAction, idx: number) => (
                        <TableRow key={idx} hover>
                          <TableCell>{action.tsCode}</TableCell>
                          <TableCell>{action.stockName}</TableCell>
                          <TableCell>
                            <Label color={ACTION_COLOR[action.action] ?? 'default'}>
                              {ACTION_LABELS[action.action] ?? action.action}
                            </Label>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color:
                                action.deltaQuantity > 0
                                  ? 'success.main'
                                  : action.deltaQuantity < 0
                                    ? 'error.main'
                                    : 'text.secondary',
                            }}
                          >
                            {action.deltaQuantity > 0 ? '+' : ''}
                            {action.deltaQuantity}
                          </TableCell>
                          <TableCell align="right">{action.targetQuantity}</TableCell>
                        </TableRow>
                      ))}
                      {actions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                            无需调仓，当前持仓已符合目标权重
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 1, color: 'text.secondary' }}
                >
                  说明：以上为参考计划，不会自动执行，请手动操作。估算基于当前市价。
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {result ? '关闭' : '取消'}
        </Button>
        {!result && (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !weightOk}
            loading={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? '生成中…' : '生成计划'}
          </Button>
        )}
        {result && (
          <Button
            variant="outlined"
            onClick={() => {
              setResult(null);
              setError('');
            }}
          >
            重新配置
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
