import type { RiskRule, CreateRiskRuleRequest, PortfolioRiskRuleType } from 'src/api/portfolio';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { upsertRiskRule, updateRiskRule } from 'src/api/portfolio';

import { RULE_TYPE_OPTIONS } from './constants';

// ----------------------------------------------------------------------

interface RiskRuleUpsertDialogProps {
  open: boolean;
  portfolioId: string;
  rule: RiskRule | null;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function RiskRuleUpsertDialog({
  open,
  portfolioId,
  rule,
  onClose,
  onConfirm,
  submitting,
}: RiskRuleUpsertDialogProps) {
  const isEdit = rule !== null;
  const [ruleType, setRuleType] = useState<PortfolioRiskRuleType>('MAX_SINGLE_POSITION');
  const [threshold, setThreshold] = useState(30);
  const [isEnabled, setIsEnabled] = useState(true);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (rule) {
        setRuleType(rule.ruleType as PortfolioRiskRuleType);
        setThreshold(Math.round(rule.threshold * 100));
        setIsEnabled(rule.isEnabled);
        setMemo(rule.memo ?? '');
      } else {
        setRuleType('MAX_SINGLE_POSITION');
        setThreshold(30);
        setIsEnabled(true);
        setMemo('');
      }
      setError('');
    }
  }, [open, rule]);

  const handleSubmit = async () => {
    setError('');
    setLocalSubmitting(true);
    try {
      if (isEdit && rule) {
        await updateRiskRule({
          ruleId: rule.id,
          threshold: threshold / 100,
          isEnabled,
          memo: memo.trim() || undefined,
        });
      } else {
        const req: CreateRiskRuleRequest = {
          portfolioId,
          ruleType,
          threshold: threshold / 100,
          isEnabled,
          memo: memo.trim() || undefined,
        };
        await upsertRiskRule(req);
      }
      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLocalSubmitting(false);
    }
  };

  const busy = submitting || localSubmitting;

  return (
    <Dialog open={open} onClose={!busy ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? '编辑风控规则' : '新增风控规则'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl fullWidth disabled={isEdit}>
            <InputLabel>规则类型</InputLabel>
            <Select
              value={ruleType}
              label="规则类型"
              onChange={(e) => setRuleType(e.target.value as PortfolioRiskRuleType)}
            >
              {RULE_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <TextField
                label="阈值 (%)"
                type="number"
                value={threshold}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v >= 1 && v <= 100) setThreshold(v);
                }}
                size="small"
                sx={{ width: 120 }}
                slotProps={{ htmlInput: { min: 1, max: 100 } }}
              />
            </Box>
            <Slider
              value={threshold}
              onChange={(_, v) => setThreshold(v as number)}
              min={1}
              max={100}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}%`}
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
              />
            }
            label="启用规则"
          />

          <TextField
            label="备注（可选）"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            multiline
            rows={2}
            disabled={busy}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={busy}
          loading={busy}
        >
          {isEdit ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
