import type { PrecomputeStatusItem } from 'src/api/factor';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { adminBackfill } from 'src/api/factor';

import { Iconify } from 'src/components/iconify';

// ─── Helpers ──────────────────────────────────────────────────

function formatToTradeDate(date: string): string {
  // Strip hyphens: '2024-01-15' → '20240115'
  return date.replace(/-/g, '');
}

function tradeDateToInput(tradeDate: string): string {
  // '20240115' → '2024-01-15'
  if (tradeDate.length !== 8) return tradeDate;
  return `${tradeDate.slice(0, 4)}-${tradeDate.slice(4, 6)}-${tradeDate.slice(6, 8)}`;
}

function diffDays(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  return Math.abs((b.getTime() - a.getTime()) / 86400000);
}

// ─── Types ────────────────────────────────────────────────────

type Props = {
  /** Factor items from the status tab — used to build autocomplete options. */
  statusItems: PrecomputeStatusItem[];
  /** Pre-selected factor names injected from the status tab via "回补" bulk action. */
  injectedFactorNames?: string[];
  /** Called when backfill job is successfully submitted. */
  onSubmitted?: (jobId: string) => void;
};

export function FactorAdminBackfillForm({
  statusItems,
  injectedFactorNames = [],
  onSubmitted,
}: Props) {
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [skipExisting, setSkipExisting] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Inject from parent (bulk action)
  useEffect(() => {
    if (injectedFactorNames.length > 0) {
      setSelectedFactors(injectedFactorNames);
    }
  }, [injectedFactorNames]);

  const factorOptions = statusItems.map((it) => it.factorName);

  const dateSpan = startDate && endDate ? diffDays(startDate, endDate) : 0;
  const isLong = dateSpan > 365;

  const validateForm = (): string => {
    if (selectedFactors.length === 0) return '请至少选择一个因子';
    if (!startDate) return '请选择起始日期';
    if (!endDate) return '请选择结束日期';
    if (startDate > endDate) return '起始日期不能晚于结束日期';
    return '';
  };

  const handleSubmitClick = () => {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await adminBackfill({
        factorNames: selectedFactors,
        startDate: formatToTradeDate(startDate),
        endDate: formatToTradeDate(endDate),
        skipExisting,
      });
      setSuccess(`回补任务已提交，JobID: ${res.jobId}`);
      onSubmitted?.(res.jobId);
    } catch {
      setError('提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Stack spacing={3}>
        {/* Factor selector */}
        <Autocomplete
          multiple
          options={factorOptions}
          value={selectedFactors}
          onChange={(_, val) => setSelectedFactors(val)}
          disableCloseOnSelect
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox size="small" style={{ marginRight: 8 }} checked={selected} />
              {option}
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label="选择因子" placeholder="搜索因子标识..." size="small" />
          )}
        />

        {/* Date range */}
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            type="date"
            label="起始日期"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
          <TextField
            type="date"
            label="结束日期"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Stack>

        {isLong && (
          <Alert severity="warning" icon={<Iconify icon="solar:danger-triangle-bold" />}>
            回补区间超过 365 天（约 {Math.round(dateSpan)} 天），可能耗时较长，请确认。
          </Alert>
        )}

        {/* Options */}
        <Tooltip title="若某因子在该交易日已有数据，跳过计算（节省时间）">
          <FormControlLabel
            control={
              <Switch checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} />
            }
            label="跳过已有数据（skipExisting）"
          />
        </Tooltip>

        {/* Messages */}
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {/* Submit */}
        <Box>
          <Button
            variant="contained"
            disabled={loading}
            onClick={handleSubmitClick}
            startIcon={<Iconify icon="solar:history-bold" />}
          >
            {loading ? '提交中...' : '提交回补任务'}
          </Button>
        </Box>
      </Stack>

      {/* Confirm dialog for long spans */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>确认提交回补</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            将对 <strong>{selectedFactors.length}</strong> 个因子回补{' '}
            <strong>
              {tradeDateToInput(formatToTradeDate(startDate))} ~{' '}
              {tradeDateToInput(formatToTradeDate(endDate))}
            </strong>
            {isLong ? (
              <>
                （
                <Typography component="span" color="warning.main">
                  共 {Math.round(dateSpan)} 天
                </Typography>
                ）
              </>
            ) : null}
            ，确认提交？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={() => setConfirmOpen(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleConfirm}>
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
