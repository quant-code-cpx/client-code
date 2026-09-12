import type { HoldingDetailItem, PortfolioShareActionType } from 'src/api/portfolio';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import {
  applyPortfolioShareAction,
  createPortfolioAccountingIdempotencyKey,
} from 'src/api/portfolio';

import { DatePicker } from 'src/components/date-picker';

// ----------------------------------------------------------------------

interface PortfolioShareActionDialogProps {
  open: boolean;
  portfolioId: string;
  holdings: HoldingDetailItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PortfolioShareActionDialog({
  open,
  portfolioId,
  holdings,
  onClose,
  onSuccess,
}: PortfolioShareActionDialogProps) {
  const [tsCode, setTsCode] = useState('');
  const [actionType, setActionType] = useState<PortfolioShareActionType>('STOCK_DIVIDEND');
  const [newQuantity, setNewQuantity] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => dayjs());
  const [recordDate, setRecordDate] = useState<dayjs.Dayjs | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTsCode('');
    setActionType('STOCK_DIVIDEND');
    setNewQuantity('');
    setEffectiveDate(dayjs());
    setRecordDate(null);
    setError('');
  }, [open]);

  const selectedHolding = holdings.find((holding) => holding.tsCode === tsCode);

  const handleSubmit = async () => {
    const parsedQuantity = Number(newQuantity);
    if (!tsCode) {
      setError('请选择持仓');
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError('变更后股数必须为正整数');
      return;
    }
    if (parsedQuantity === selectedHolding?.quantity) {
      setError('变更后股数不能与当前股数相同');
      return;
    }
    if (!effectiveDate?.isValid()) {
      setError('请选择有效生效日');
      return;
    }
    if (effectiveDate.isAfter(dayjs(), 'day')) {
      setError('生效日不能晚于今天');
      return;
    }
    if (recordDate?.isValid() && recordDate.isAfter(effectiveDate, 'day')) {
      setError('股权登记日不能晚于生效日');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await applyPortfolioShareAction({
        portfolioId,
        tsCode,
        actionType,
        newQuantity: parsedQuantity,
        effectiveDate: effectiveDate.format('YYYYMMDD'),
        recordDate: recordDate?.isValid() ? recordDate.format('YYYYMMDD') : undefined,
        idempotencyKey: createPortfolioAccountingIdempotencyKey('corporate-action'),
      });
      onClose();
      onSuccess();
    } catch {
      setError('公司行动记账失败，请核对持仓与生效日');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>记录送股 / 拆并股</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          只调整股数和单位成本，持仓总成本保持不变。现金分红请使用现金事件。
        </DialogContentText>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            size="small"
            label="持仓"
            value={tsCode}
            onChange={(event) => {
              const code = event.target.value;
              setTsCode(code);
              const holding = holdings.find((item) => item.tsCode === code);
              setNewQuantity(holding ? String(holding.quantity) : '');
            }}
            disabled={submitting}
          >
            {holdings.map((holding) => (
              <MenuItem key={holding.tsCode} value={holding.tsCode}>
                {holding.tsCode} {holding.stockName}（当前 {holding.quantity} 股）
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="公司行动"
            value={actionType}
            onChange={(event) => setActionType(event.target.value as PortfolioShareActionType)}
            disabled={submitting}
          >
            <MenuItem value="STOCK_DIVIDEND">送股 / 转增</MenuItem>
            <MenuItem value="SPLIT">拆股 / 合股</MenuItem>
          </TextField>
          <TextField
            size="small"
            type="number"
            label="变更后总股数"
            value={newQuantity}
            onChange={(event) => setNewQuantity(event.target.value)}
            helperText={selectedHolding ? `当前 ${selectedHolding.quantity} 股` : undefined}
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
            disabled={submitting}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <DatePicker
              label="生效日"
              value={effectiveDate}
              onChange={(value) => value && setEffectiveDate(value)}
              maxDate={dayjs()}
              disabled={submitting}
              sx={{ width: 1 }}
            />
            <DatePicker
              label="股权登记日（选填）"
              value={recordDate}
              onChange={setRecordDate}
              maxDate={effectiveDate}
              disabled={submitting}
              sx={{ width: 1 }}
            />
          </Box>
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
