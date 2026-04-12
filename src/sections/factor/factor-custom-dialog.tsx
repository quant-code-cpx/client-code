import type {
  FactorCategory,
  CustomFactorTestResponse,
  CustomFactorCreateRequest,
} from 'src/api/factor';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { createCustomFactor, updateCustomFactor, testCustomExpression } from 'src/api/factor';

// ----------------------------------------------------------------------

const CATEGORY_OPTIONS: { value: FactorCategory; label: string }[] = [
  { value: 'VALUATION', label: '估值' },
  { value: 'SIZE', label: '规模' },
  { value: 'MOMENTUM', label: '动量' },
  { value: 'VOLATILITY', label: '波动率' },
  { value: 'LIQUIDITY', label: '流动性' },
  { value: 'QUALITY', label: '质量' },
  { value: 'GROWTH', label: '成长' },
  { value: 'CAPITAL_FLOW', label: '资金流' },
  { value: 'LEVERAGE', label: '杠杆' },
  { value: 'DIVIDEND', label: '红利' },
  { value: 'TECHNICAL', label: '技术' },
  { value: 'CUSTOM', label: '自定义' },
];

// ----------------------------------------------------------------------

interface FactorCustomDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editFactor?: { id: string; name: string; label: string; description?: string; category: FactorCategory; expression?: string } | null;
}

export function FactorCustomDialog({ open, onClose, onSuccess, editFactor }: FactorCustomDialogProps) {
  const isEdit = !!editFactor;

  const [name, setName] = useState(editFactor?.name ?? '');
  const [label, setLabel] = useState(editFactor?.label ?? '');
  const [description, setDescription] = useState(editFactor?.description ?? '');
  const [category, setCategory] = useState<FactorCategory>(editFactor?.category ?? 'CUSTOM');
  const [expression, setExpression] = useState(editFactor?.expression ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [testResult, setTestResult] = useState<CustomFactorTestResponse | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');

  const handleTest = async () => {
    if (!expression.trim()) return;
    setTesting(true);
    setTestError('');
    setTestResult(null);
    try {
      const res = await testCustomExpression({ expression });
      setTestResult(res);
    } catch {
      setTestError('试算失败，请检查表达式语法');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !label.trim() || !expression.trim()) {
      setError('请填写必填字段');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (isEdit) {
        await updateCustomFactor({
          name: editFactor!.name ?? editFactor!.id,
          label,
          description: description || undefined,
          category,
          expression,
        });
      } else {
        const dto: CustomFactorCreateRequest = {
          name,
          label,
          description: description || undefined,
          category,
          expression,
        };
        await createCustomFactor(dto);
      }
      onSuccess();
      onClose();
    } catch {
      setError(isEdit ? '更新因子失败' : '创建因子失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? '编辑自定义因子' : '创建自定义因子'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 2 }}>
          <TextField
            label="因子标识"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            disabled={isEdit}
            required
            placeholder="my_factor"
            sx={{ flex: 1 }}
          />
          <TextField
            label="中文名称"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            size="small"
            required
            placeholder="我的因子"
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>分类</InputLabel>
            <Select
              value={category}
              label="分类"
              onChange={(e) => setCategory(e.target.value as FactorCategory)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TextField
          label="描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="表达式"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          multiline
          minRows={3}
          maxRows={6}
          fullWidth
          required
          placeholder="例如：close / rolling_mean(close, 20) - 1"
          sx={{ mb: 2, fontFamily: 'monospace' }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="outlined" size="small" onClick={handleTest} disabled={testing || !expression.trim()}>
            {testing ? '试算中...' : '试算表达式'}
          </Button>
        </Box>

        {testing && <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />}
        {testError && <Alert severity="error">{testError}</Alert>}

        {testResult && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              试算结果（{testResult.tradeDate}）· 有效值 {testResult.stats.nonNull}/{testResult.stats.count}
              {testResult.stats.mean != null && ` · 均值 ${testResult.stats.mean.toFixed(4)}`}
            </Typography>
            <TableContainer sx={{ maxHeight: 200 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>股票代码</TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell align="right">因子值</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testResult.samples.map((s) => (
                    <TableRow key={s.tsCode}>
                      <TableCell>{s.tsCode}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell align="right">
                        {s.value != null ? s.value.toFixed(4) : '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '提交中...' : isEdit ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
