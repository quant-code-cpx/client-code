import type { DataGapsResult } from 'src/api/tushare-sync';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';

import { tushareSyncApi } from 'src/api/tushare-sync';

// ----------------------------------------------------------------------

const DATA_SET_OPTIONS = [
  { value: 'daily', label: '日线行情 (daily)' },
  { value: 'weekly', label: '周线行情 (weekly)' },
  { value: 'monthly', label: '月线行情 (monthly)' },
  { value: 'adjFactor', label: '复权因子 (adjFactor)' },
  { value: 'income', label: '利润表 (income)' },
  { value: 'balanceSheet', label: '资产负债表 (balanceSheet)' },
  { value: 'cashflow', label: '现金流量表 (cashflow)' },
  { value: 'moneyflowDc', label: '资金流向 (moneyflowDc)' },
];

export function DataGapsPanel() {
  const [dataSet, setDataSet] = useState('daily');
  const [result, setResult] = useState<DataGapsResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    setLoading(true);
    try {
      const data = await tushareSyncApi.getDataGaps(dataSet);
      setResult(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>数据集</InputLabel>
          <Select
            label="数据集"
            value={dataSet}
            onChange={(e) => {
              setDataSet(e.target.value);
              setResult(null);
            }}
          >
            {DATA_SET_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          size="small"
          onClick={handleQuery}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : undefined}
        >
          {loading ? '查询中...' : '查询缺失日期'}
        </Button>
      </Stack>

      {result !== null && (
        <Box sx={{ mt: 2 }}>
          {result.gaps.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'success.main' }}>
              该数据集暂无缺失数据 ✅
            </Typography>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                共缺失 <strong>{result.total}</strong> 个交易日：
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {result.gaps.map((gap) => (
                  <Chip key={gap} label={gap} size="small" color="warning" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
