import type { StockSearchItem } from 'src/api/stock';
import type {
  OmitAction,
  RebalanceAction,
  HoldingDetailItem,
  RebalancePlanResponse,
} from 'src/api/portfolio';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { fCurrency } from 'src/utils/format-number';

import { rebalancePlan } from 'src/api/portfolio';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import {
  stockItemFromCode,
  StockSearchAutocomplete,
} from 'src/components/stock-search-autocomplete';

// ----------------------------------------------------------------------

interface TargetRow {
  stock: StockSearchItem | null;
  targetWeight: number; // 0~100 (百分比)
}

interface RebalancePlanDialogProps {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
  holdings: HoldingDetailItem[];
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

const EMPTY_TARGET: TargetRow = { stock: null, targetWeight: 0 };

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Number(trimmed);
}

function stockFromHolding(holding: HoldingDetailItem): StockSearchItem {
  return {
    tsCode: holding.tsCode,
    symbol: '',
    name: holding.stockName,
    market: null,
    industry: holding.industry,
    listStatus: null,
  };
}

function buildOrderText(actions: RebalanceAction[]): string {
  const rows = actions
    .filter((action) => action.deltaQuantity !== 0)
    .map((action) => {
      const direction = action.deltaQuantity > 0 ? '买入' : '卖出';
      return [direction, action.tsCode, action.stockName, Math.abs(action.deltaQuantity)].join(
        '\t'
      );
    });

  if (rows.length === 0) return '无需调仓，当前持仓已符合目标权重。';

  return ['方向\t股票代码\t股票名称\t数量', ...rows].join('\n');
}

export function PortfolioRebalanceDialog({
  open,
  onClose,
  holdings,
  portfolioId,
}: RebalancePlanDialogProps) {
  const [targets, setTargets] = useState<TargetRow[]>([EMPTY_TARGET]);
  const [omitUnspecified, setOmitUnspecified] = useState<OmitAction>('HOLD');
  const [totalValue, setTotalValue] = useState('');
  const [commissionRate, setCommissionRate] = useState('0.0003');
  const [stampDutyRate, setStampDutyRate] = useState('0.0005');
  const [minCommission, setMinCommission] = useState('5');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [result, setResult] = useState<RebalancePlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalWeight = targets.reduce((sum, target) => sum + (target.targetWeight || 0), 0);
  const weightOk = totalWeight > 0 && totalWeight <= 100;

  function addRow() {
    setTargets((prev) => [...prev, EMPTY_TARGET]);
  }

  function removeRow(idx: number) {
    setTargets((prev) => prev.filter((_, index) => index !== idx));
  }

  function updateRow(idx: number, patch: Partial<TargetRow>) {
    setTargets((prev) => prev.map((row, index) => (index === idx ? { ...row, ...patch } : row)));
  }

  function handleUseCurrentHoldings() {
    if (holdings.length === 0) return;
    setTargets(
      holdings.map((holding) => ({
        stock: stockFromHolding(holding),
        targetWeight: Number(((holding.weight ?? 0) * 100).toFixed(2)),
      }))
    );
    setResult(null);
    setCopyMessage('');
  }

  function handleClose() {
    setTargets([EMPTY_TARGET]);
    setOmitUnspecified('HOLD');
    setTotalValue('');
    setCommissionRate('0.0003');
    setStampDutyRate('0.0005');
    setMinCommission('5');
    setAdvancedOpen(false);
    setCopyMessage('');
    setResult(null);
    setError('');
    onClose();
  }

  const handleGenerate = async () => {
    const validTargets = targets.filter(
      (target) => target.stock?.tsCode && target.targetWeight > 0
    );
    const parsedTotalValue = toOptionalNumber(totalValue);
    const parsedCommissionRate = toOptionalNumber(commissionRate);
    const parsedStampDutyRate = toOptionalNumber(stampDutyRate);
    const parsedMinCommission = toOptionalNumber(minCommission);

    if (validTargets.length === 0) {
      setError('请至少选择一只股票并填写目标权重');
      return;
    }
    if (totalWeight > 100.01) {
      setError('目标权重合计不能超过 100%');
      return;
    }
    if (
      [parsedTotalValue, parsedCommissionRate, parsedStampDutyRate, parsedMinCommission].some(
        (value) => value !== undefined && Number.isNaN(value)
      )
    ) {
      setError('高级参数必须是有效数字');
      return;
    }

    setLoading(true);
    setError('');
    setCopyMessage('');
    setResult(null);
    try {
      const res = await rebalancePlan({
        portfolioId,
        omitUnspecified,
        totalValue: parsedTotalValue,
        commissionRate: parsedCommissionRate,
        stampDutyRate: parsedStampDutyRate,
        minCommission: parsedMinCommission,
        targets: validTargets.map((target) => ({
          tsCode: target.stock?.tsCode.trim().toUpperCase() ?? '',
          targetWeight: target.targetWeight / 100,
        })),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成调仓计划失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOrders = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildOrderText(result.actions));
      setCopyMessage('委托清单已复制，可粘贴到券商或交易笔记中。');
    } catch {
      setCopyMessage('复制失败，请手动选择表格内容复制。');
    }
  };

  const actions = result?.actions ?? [];

  return (
    <Dialog open={open} onClose={!loading ? handleClose : undefined} maxWidth="md" fullWidth>
      <DialogTitle>生成调仓计划</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {copyMessage && (
            <Alert severity={copyMessage.startsWith('复制失败') ? 'warning' : 'success'}>
              {copyMessage}
            </Alert>
          )}

          <Box>
            <Box
              sx={{
                mb: 1.5,
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="subtitle2">目标持仓权重</Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={loading || holdings.length === 0}
                onClick={handleUseCurrentHoldings}
                startIcon={<Iconify icon="solar:wallet-bold" />}
              >
                从当前持仓带入
              </Button>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>股票</TableCell>
                    <TableCell align="right" sx={{ width: 150 }}>
                      目标权重 (%)
                    </TableCell>
                    <TableCell width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {targets.map((row, idx) => (
                    <TableRow key={`${row.stock?.tsCode ?? 'empty'}-${idx}`}>
                      <TableCell>
                        <StockSearchAutocomplete
                          fullWidth
                          value={row.stock ?? stockItemFromCode(null)}
                          disabled={loading}
                          placeholder="输入股票代码或名称"
                          onChange={(stock) => updateRow(idx, { stock })}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={row.targetWeight}
                          onChange={(event) =>
                            updateRow(idx, { targetWeight: Number(event.target.value) })
                          }
                          disabled={loading}
                          inputProps={{ min: 0, max: 100, step: 0.5 }}
                          sx={{ width: 112 }}
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

          <Divider />

          <Box>
            <Button
              size="small"
              color="inherit"
              onClick={() => setAdvancedOpen((value) => !value)}
              endIcon={
                <Iconify
                  icon={advancedOpen ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                />
              }
            >
              高级成本参数
            </Button>
            <Collapse in={advancedOpen}>
              <Box
                sx={{
                  gap: 2,
                  mt: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                }}
              >
                <TextField
                  size="small"
                  label="佣金率"
                  value={commissionRate}
                  onChange={(event) => setCommissionRate(event.target.value)}
                  helperText="默认 0.0003"
                />
                <TextField
                  size="small"
                  label="最小佣金"
                  value={minCommission}
                  onChange={(event) => setMinCommission(event.target.value)}
                  helperText="默认 ¥5"
                />
                <TextField
                  size="small"
                  label="印花税率"
                  value={stampDutyRate}
                  onChange={(event) => setStampDutyRate(event.target.value)}
                  helperText="卖出侧估算，默认 0.0005"
                />
                <TextField
                  size="small"
                  label="总市值覆盖"
                  value={totalValue}
                  onChange={(event) => setTotalValue(event.target.value)}
                  helperText="不填则使用后端当前组合估值"
                />
                <FormControl size="small">
                  <InputLabel>未指定持仓</InputLabel>
                  <Select
                    label="未指定持仓"
                    value={omitUnspecified}
                    onChange={(event) => setOmitUnspecified(event.target.value as OmitAction)}
                  >
                    <MenuItem value="HOLD">保持不动</MenuItem>
                    <MenuItem value="SELL">卖出清仓</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Collapse>
          </Box>

          {result && (
            <>
              <Divider />
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1.5,
                  }}
                >
                  <Typography variant="subtitle2">调仓操作清单</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      预估交易成本：{fCurrency(result.estimatedCost)}
                    </Typography>
                    <Button size="small" variant="outlined" onClick={handleCopyOrders}>
                      复制委托清单
                    </Button>
                  </Box>
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
                      {actions.map((action: RebalanceAction) => (
                        <TableRow key={`${action.tsCode}-${action.action}`} hover>
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
                  说明：以上为参考计划，不会自动执行。实盘组合请人工确认后下单，模拟盘执行接口后续开放。
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
              setCopyMessage('');
            }}
          >
            重新配置
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
