import type { Watchlist } from 'src/api/watchlist';
import type { PortfolioListItem } from 'src/api/portfolio';
import type { PriceAlertRule, PriceAlertRuleType, CreatePriceRuleBody } from 'src/api/alert';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { alertApi } from 'src/api/alert';
import { getWatchlists } from 'src/api/watchlist';
import { listPortfolios } from 'src/api/portfolio';

// ----------------------------------------------------------------------

const RULE_TYPE_OPTIONS: Array<{ value: PriceAlertRuleType; label: string }> = [
  { value: 'PCT_CHANGE_UP', label: '涨幅超过（%）' },
  { value: 'PCT_CHANGE_DOWN', label: '跌幅超过（%）' },
  { value: 'PRICE_ABOVE', label: '价格高于（元）' },
  { value: 'PRICE_BELOW', label: '价格低于（元）' },
  { value: 'LIMIT_UP', label: '涨停' },
  { value: 'LIMIT_DOWN', label: '跌停' },
];

const NO_THRESHOLD_TYPES: PriceAlertRuleType[] = ['LIMIT_UP', 'LIMIT_DOWN'];

function thresholdUnit(ruleType: PriceAlertRuleType): string {
  if (ruleType === 'PCT_CHANGE_UP' || ruleType === 'PCT_CHANGE_DOWN') return '%';
  if (ruleType === 'PRICE_ABOVE' || ruleType === 'PRICE_BELOW') return '元';
  return '';
}

type SourceMode = 'stock' | 'watchlist' | 'portfolio';

type Props = {
  open: boolean;
  rule: PriceAlertRule | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AlertPriceRuleDialog({ open, rule, onClose, onSaved }: Props) {
  const isEdit = !!rule;

  const [sourceMode, setSourceMode] = useState<SourceMode>('stock');
  const [tsCode, setTsCode] = useState('');
  const [watchlistId, setWatchlistId] = useState<number | ''>('');
  const [portfolioId, setPortfolioId] = useState<string>('');
  const [ruleType, setRuleType] = useState<PriceAlertRuleType>('PCT_CHANGE_UP');
  const [threshold, setThreshold] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);

  // 打开对话框时加载自选股组 & 组合列表
  useEffect(() => {
    if (!open) return;
    getWatchlists()
      .then(setWatchlists)
      .catch(() => {});
    listPortfolios()
      .then(setPortfolios)
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) {
      if (rule) {
        setTsCode(rule.tsCode ?? '');
        setRuleType(rule.ruleType);
        setThreshold(rule.threshold !== null ? String(rule.threshold) : '');
        setMemo(rule.memo ?? '');
        // 根据已有规则推断来源模式
        if (rule.watchlistId) {
          setSourceMode('watchlist');
          setWatchlistId(rule.watchlistId);
        } else if (rule.portfolioId) {
          setSourceMode('portfolio');
          setPortfolioId(rule.portfolioId);
        } else {
          setSourceMode('stock');
        }
      } else {
        setSourceMode('stock');
        setTsCode('');
        setWatchlistId('');
        setPortfolioId('');
        setRuleType('PCT_CHANGE_UP');
        setThreshold('');
        setMemo('');
      }
      setError('');
    }
  }, [open, rule]);

  const needsThreshold = !NO_THRESHOLD_TYPES.includes(ruleType);

  const handleSubmit = async () => {
    if (sourceMode === 'stock' && !tsCode.trim()) {
      setError('请输入股票代码');
      return;
    }
    if (sourceMode === 'watchlist' && !watchlistId) {
      setError('请选择自选股组');
      return;
    }
    if (sourceMode === 'portfolio' && !portfolioId) {
      setError('请选择组合');
      return;
    }
    if (needsThreshold && !threshold) {
      setError('请输入阈值');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const body: CreatePriceRuleBody = {
        ruleType,
        threshold: needsThreshold ? Number(threshold) : undefined,
        memo: memo.trim() || undefined,
      };

      if (sourceMode === 'stock') {
        body.tsCode = tsCode.trim().toUpperCase();
      } else if (sourceMode === 'watchlist') {
        body.watchlistId = watchlistId as number;
      } else {
        body.portfolioId = portfolioId;
      }

      if (isEdit && rule) {
        await alertApi.updatePriceRule(rule.id, {
          tsCode: sourceMode === 'stock' ? tsCode.trim().toUpperCase() : undefined,
          ruleType: body.ruleType,
          threshold: needsThreshold ? Number(threshold) : null,
          memo: body.memo,
        });
      } else {
        await alertApi.createPriceRule(body);
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? '编辑预警规则' : '新建预警规则'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {!isEdit && (
            <ToggleButtonGroup
              value={sourceMode}
              exclusive
              onChange={(_e, v: SourceMode | null) => {
                if (v) setSourceMode(v);
              }}
              size="small"
              fullWidth
              disabled={submitting}
            >
              <ToggleButton value="stock">单只股票</ToggleButton>
              <ToggleButton value="watchlist">自选股组</ToggleButton>
              <ToggleButton value="portfolio">组合持仓</ToggleButton>
            </ToggleButtonGroup>
          )}

          {sourceMode === 'stock' && (
            <TextField
              label="股票代码"
              required
              value={tsCode}
              onChange={(e) => setTsCode(e.target.value)}
              placeholder="如 000001.SZ"
              disabled={submitting}
            />
          )}

          {sourceMode === 'watchlist' && (
            <FormControl disabled={submitting} required>
              <InputLabel>自选股组</InputLabel>
              <Select
                value={watchlistId}
                label="自选股组"
                onChange={(e) => setWatchlistId(e.target.value as number)}
              >
                {watchlists.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}（{w._count.stocks} 只）
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {sourceMode === 'portfolio' && (
            <FormControl disabled={submitting} required>
              <InputLabel>组合</InputLabel>
              <Select
                value={portfolioId}
                label="组合"
                onChange={(e) => setPortfolioId(e.target.value as string)}
              >
                {portfolios.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}（{p.holdingCount} 只持仓）
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl disabled={submitting}>
            <InputLabel>规则类型</InputLabel>
            <Select
              value={ruleType}
              label="规则类型"
              onChange={(e) => {
                setRuleType(e.target.value as PriceAlertRuleType);
                setThreshold('');
              }}
            >
              {RULE_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {needsThreshold && (
            <TextField
              label="阈值"
              required
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              disabled={submitting}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">{thresholdUnit(ruleType)}</InputAdornment>
                  ),
                },
              }}
              inputProps={{ min: 0 }}
            />
          )}

          <TextField
            label="备注（可选）"
            multiline
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            disabled={submitting}
            inputProps={{ maxLength: 200 }}
            helperText={`${memo.length}/200`}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} loading={submitting}>
          {isEdit ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
