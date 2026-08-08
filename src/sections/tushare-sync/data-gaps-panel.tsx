import type { DataGapsResult } from 'src/api/tushare-sync';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';

import { tushareSyncApi } from 'src/api/tushare-sync';

// ----------------------------------------------------------------------

const DATA_SET_OPTIONS: Array<{ label: string; value: string; group: string }> = [
  // 日频行情
  { label: '日线行情 (daily)', value: 'daily', group: '日频行情' },
  { label: '每日指标 (dailyBasic)', value: 'dailyBasic', group: '日频行情' },
  { label: '复权因子 (adjFactor)', value: 'adjFactor', group: '日频行情' },
  { label: '指数日线 (indexDaily)', value: 'indexDaily', group: '日频行情' },
  { label: '融资融券 (marginDetail)', value: 'marginDetail', group: '日频行情' },
  { label: '个股资金流 (moneyflow)', value: 'moneyflow', group: '日频行情' },
  { label: '行业资金流 (moneyflowIndDc)', value: 'moneyflowIndDc', group: '日频行情' },
  { label: '市场资金流 (moneyflowMktDc)', value: 'moneyflowMktDc', group: '日频行情' },
  { label: '沪深港通 (moneyflowHsgt)', value: 'moneyflowHsgt', group: '日频行情' },
  // 周/月频行情
  { label: '周线行情 (weekly)', value: 'weekly', group: '周月行情' },
  { label: '月线行情 (monthly)', value: 'monthly', group: '周月行情' },
  // 事件型
  { label: '涨跌停 (stkLimit)', value: 'stkLimit', group: '事件型' },
  { label: '停牌 (suspendD)', value: 'suspendD', group: '事件型' },
  { label: '龙虎榜 (topList)', value: 'topList', group: '事件型' },
  { label: '龙虎榜机构 (topInst)', value: 'topInst', group: '事件型' },
  { label: '大宗交易 (blockTrade)', value: 'blockTrade', group: '事件型' },
  { label: '限售解禁 (shareFloat)', value: 'shareFloat', group: '事件型' },
  // 财务报表
  { label: '利润表 (income)', value: 'income', group: '财务报表' },
  { label: '资产负债表 (balanceSheet)', value: 'balanceSheet', group: '财务报表' },
  { label: '现金流量表 (cashflow)', value: 'cashflow', group: '财务报表' },
  { label: '业绩快报 (express)', value: 'express', group: '财务报表' },
  { label: '财务指标 (finaIndicator)', value: 'finaIndicator', group: '财务报表' },
  // 财务事件
  { label: '分红 (dividend)', value: 'dividend', group: '财务事件' },
  { label: '十大股东 (top10Holders)', value: 'top10Holders', group: '财务事件' },
  { label: '十大流通股东 (top10FloatHolders)', value: 'top10FloatHolders', group: '财务事件' },
  // 基础信息
  { label: '股票基础信息 (stockBasic)', value: 'stockBasic', group: '基础信息' },
  { label: '交易日历 (tradeCal)', value: 'tradeCal', group: '基础信息' },
  { label: '公司基础信息 (stockCompany)', value: 'stockCompany', group: '基础信息' },
  // 因子
  { label: '指数权重 (indexWeight)', value: 'indexWeight', group: '因子' },
];

export function DataGapsPanel() {
  const [selectedOption, setSelectedOption] = useState(DATA_SET_OPTIONS[0]);
  const [result, setResult] = useState<DataGapsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuery = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await tushareSyncApi.getDataGaps(selectedOption.value);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询数据缺口失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
        <Autocomplete
          size="small"
          disablePortal
          options={DATA_SET_OPTIONS}
          value={selectedOption}
          groupBy={(option) => option.group}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          onChange={(_, value) => {
            if (!value) return;
            setSelectedOption(value);
            setResult(null);
            setError('');
          }}
          renderInput={(params) => <TextField {...params} label="数据集" />}
          sx={{ width: { xs: 1, sm: 360 } }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleQuery}
          disabled={loading}
          loading={loading}
        >
          {loading ? '查询中…' : '查询缺失日期'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
          {result ? '，当前展示上次成功快照。' : ''}
        </Alert>
      )}

      {result !== null && (
        <Box sx={{ mt: 2 }}>
          {result.gaps.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'success.main' }}>
              该数据集暂无缺失数据
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
