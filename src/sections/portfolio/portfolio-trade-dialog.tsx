import type { StockSearchItem } from 'src/api/stock';
import type { HoldingDetailItem, PortfolioTradeSide } from 'src/api/portfolio';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import DialogContentText from '@mui/material/DialogContentText';

import { recordPortfolioTrade, createPortfolioAccountingIdempotencyKey } from 'src/api/portfolio';

import { DatePicker } from 'src/components/date-picker';
import { StockSearchAutocomplete } from 'src/components/stock-search-autocomplete';

// ----------------------------------------------------------------------

interface PortfolioTradeDialogProps {
  open: boolean;
  portfolioId: string;
  holdings: HoldingDetailItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PortfolioTradeDialog({
  open,
  portfolioId,
  holdings,
  onClose,
  onSuccess,
}: PortfolioTradeDialogProps) {
  const [side, setSide] = useState<PortfolioTradeSide>('BUY');
  const [stock, setStock] = useState<StockSearchItem | null>(null);
  const [holdingCode, setHoldingCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('0');
  const [tax, setTax] = useState('0');
  const [effectiveDate, setEffectiveDate] = useState(() => dayjs());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSide('BUY');
    setStock(null);
    setHoldingCode('');
    setQuantity('');
    setPrice('');
    setCommission('0');
    setTax('0');
    setEffectiveDate(dayjs());
    setError('');
  }, [open]);

  const handleSubmit = async () => {
    const tsCode = side === 'BUY' ? stock?.tsCode : holdingCode;
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    const parsedCommission = Number(commission || 0);
    const parsedTax = Number(tax || 0);
    const selectedHolding = holdings.find((holding) => holding.tsCode === holdingCode);

    if (!tsCode) {
      setError(side === 'BUY' ? '请选择买入标的' : '请选择卖出持仓');
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError('成交数量必须为正整数');
      return;
    }
    if (side === 'SELL' && selectedHolding && parsedQuantity > selectedHolding.quantity) {
      setError(`卖出数量不能超过可用持仓 ${selectedHolding.quantity} 股`);
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('请输入有效成交价');
      return;
    }
    if (parsedCommission < 0 || parsedTax < 0) {
      setError('佣金和税费不能为负数');
      return;
    }
    if (!effectiveDate?.isValid()) {
      setError('请选择有效交易日');
      return;
    }
    if (effectiveDate.isAfter(dayjs(), 'day')) {
      setError('交易日不能晚于今天');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await recordPortfolioTrade({
        portfolioId,
        tsCode,
        side,
        quantity: parsedQuantity,
        price: parsedPrice,
        commission: parsedCommission,
        tax: parsedTax,
        effectiveDate: effectiveDate.format('YYYYMMDD'),
        idempotencyKey: createPortfolioAccountingIdempotencyKey('trade'),
      });
      onClose();
      onSuccess();
    } catch {
      setError('成交记账失败，请核对现金、持仓和交易日');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>记录成交</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          这是研究组合记账，不会向券商发送订单。成交、费用、持仓与现金将原子入账。
        </DialogContentText>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <ToggleButtonGroup
            exclusive
            size="small"
            value={side}
            onChange={(_, value: PortfolioTradeSide | null) => value && setSide(value)}
            aria-label="成交方向"
          >
            <ToggleButton value="BUY" aria-label="买入">
              买入
            </ToggleButton>
            <ToggleButton value="SELL" aria-label="卖出">
              卖出
            </ToggleButton>
          </ToggleButtonGroup>

          {side === 'BUY' ? (
            <StockSearchAutocomplete
              label="成交标的"
              value={stock}
              onChange={setStock}
              disabled={submitting}
              fullWidth
            />
          ) : (
            <TextField
              select
              size="small"
              label="卖出持仓"
              value={holdingCode}
              onChange={(event) => setHoldingCode(event.target.value)}
              disabled={submitting}
            >
              {holdings.map((holding) => (
                <MenuItem key={holding.tsCode} value={holding.tsCode}>
                  {holding.tsCode} {holding.stockName}（{holding.quantity} 股）
                </MenuItem>
              ))}
            </TextField>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              size="small"
              type="number"
              label="成交数量（股）"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              disabled={submitting}
            />
            <TextField
              size="small"
              type="number"
              label="成交价（元/股）"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              slotProps={{ htmlInput: { min: 0.0001, step: 0.01 } }}
              disabled={submitting}
            />
            <TextField
              size="small"
              type="number"
              label="佣金（元）"
              value={commission}
              onChange={(event) => setCommission(event.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              disabled={submitting}
            />
            <TextField
              size="small"
              type="number"
              label="税费（元）"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              disabled={submitting}
            />
          </Box>
          <DatePicker
            label="交易日"
            value={effectiveDate}
            onChange={(value) => value && setEffectiveDate(value)}
            maxDate={dayjs()}
            disabled={submitting}
            sx={{ width: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} loading={submitting}>
          确认记账
        </Button>
      </DialogActions>
    </Dialog>
  );
}
