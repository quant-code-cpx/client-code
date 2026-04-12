import type { PortfolioListItem } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import FormLabel from '@mui/material/FormLabel';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { applyBacktest, listPortfolios } from 'src/api/portfolio';

// ----------------------------------------------------------------------

interface BacktestApplyPortfolioDialogProps {
  open: boolean;
  onClose: () => void;
  runId: string;
  onSuccess: (portfolioId: string, portfolioName: string) => void;
}

export function BacktestApplyPortfolioDialog({
  open,
  onClose,
  runId,
  onSuccess,
}: BacktestApplyPortfolioDialogProps) {
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [createNew, setCreateNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInitialCash, setNewInitialCash] = useState(1000000);
  const [mode, setMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoadingList(true);
    setError('');
    setCreateNew(false);
    setNewName('');
    setNewInitialCash(1000000);
    setMode('REPLACE');
    listPortfolios()
      .then((list) => {
        setPortfolios(list);
        setSelectedPortfolioId(list[0]?.id ?? '');
      })
      .catch(() => setError('加载组合列表失败'))
      .finally(() => setLoadingList(false));
  }, [open]);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (createNew) {
        if (!newName.trim()) {
          setError('请输入新组合名称');
          setLoading(false);
          return;
        }
        await applyBacktest({
          backtestRunId: runId,
          portfolioName: newName.trim(),
          mode,
        });
        onSuccess('', newName.trim());
      } else {
        if (!selectedPortfolioId) {
          setError('请选择目标组合');
          setLoading(false);
          return;
        }
        await applyBacktest({
          backtestRunId: runId,
          portfolioId: selectedPortfolioId,
          mode,
        });
        const portfolio = portfolios.find((p) => p.id === selectedPortfolioId);
        onSuccess(selectedPortfolioId, portfolio?.name ?? '');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [runId, createNew, newName, mode, selectedPortfolioId, portfolios, onSuccess, onClose]);

  return (
    <Dialog open={open} onClose={!loading ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>将回测持仓导入组合</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Create new toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={createNew}
                onChange={(e) => setCreateNew(e.target.checked)}
                disabled={loading}
              />
            }
            label="新建组合"
          />

          {createNew ? (
            <>
              <TextField
                label="组合名称"
                required
                size="small"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <TextField
                label="初始资金（元）"
                type="number"
                size="small"
                value={newInitialCash}
                onChange={(e) => setNewInitialCash(Number(e.target.value))}
                disabled={loading}
                inputProps={{ min: 10000, step: 10000 }}
              />
            </>
          ) : (
            <FormControl size="small" fullWidth disabled={loadingList || loading}>
              <InputLabel>目标组合</InputLabel>
              <Select
                label="目标组合"
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
              >
                {portfolios.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
                {portfolios.length === 0 && !loadingList && (
                  <MenuItem disabled>暂无组合，请先新建</MenuItem>
                )}
              </Select>
            </FormControl>
          )}

          <Divider />

          {/* Mode */}
          <FormControl disabled={loading}>
            <FormLabel sx={{ mb: 1, fontSize: 14 }}>导入模式</FormLabel>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} row>
              <FormControlLabel
                value="REPLACE"
                control={<Radio />}
                label="替换（清空原持仓后全量导入）"
              />
              <FormControlLabel value="MERGE" control={<Radio />} label="合并（与现有持仓合并）" />
            </RadioGroup>
          </FormControl>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            导入数据为回测结束日的持仓快照
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || loadingList}
          loading={loading}
        >
          确认导入
        </Button>
      </DialogActions>
    </Dialog>
  );
}
