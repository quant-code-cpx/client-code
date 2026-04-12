import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import FormHelperText from '@mui/material/FormHelperText';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import {
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  PRICE_MODE_OPTIONS,
  REBALANCE_FREQUENCY_OPTIONS,
} from './constants';

import type { BacktestRunForm } from './types';

// ----------------------------------------------------------------------

interface BacktestConfigFormProps {
  form: BacktestRunForm;
  onChange: (updates: Partial<BacktestRunForm>) => void;
}

export function BacktestConfigForm({ form, onChange }: BacktestConfigFormProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        {/* A. 基础配置 */}
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          基础配置
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="回测名称"
              placeholder="例：沪深300 均线择时 2020-2024"
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              helperText="不填则自动生成"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label="起始日期"
              value={form.startDate ? dayjs(form.startDate) : null}
              onChange={(v) => onChange({ startDate: v?.format('YYYY-MM-DD') ?? '' })}
              format="YYYY-MM-DD"
              sx={{ width: '100%' }}
              slotProps={{
                textField: { size: 'small' },
                field: { clearable: true },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label="结束日期"
              value={form.endDate ? dayjs(form.endDate) : null}
              onChange={(v) => onChange({ endDate: v?.format('YYYY-MM-DD') ?? '' })}
              format="YYYY-MM-DD"
              sx={{ width: '100%' }}
              slotProps={{
                textField: { size: 'small' },
                field: { clearable: true },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="初始资金（元）"
              type="number"
              fullWidth
              size="small"
              value={form.initialCapital}
              onChange={(e) => onChange({ initialCapital: Number(e.target.value) })}
              helperText="默认 100 万元"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>基准指数</InputLabel>
              <Select
                label="基准指数"
                value={form.benchmarkTsCode}
                onChange={(e) => onChange({ benchmarkTsCode: e.target.value })}
              >
                {BENCHMARK_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* B. 股票池 */}
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          股票池
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small">
              <InputLabel>股票池范围</InputLabel>
              <Select
                label="股票池范围"
                value={form.universe}
                onChange={(e) => onChange({ universe: e.target.value })}
              >
                {UNIVERSE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>决定回测中选股的候选范围</FormHelperText>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* C. 交易执行 */}
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          交易执行
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              调仓频率
            </Typography>
            <ToggleButtonGroup
              value={form.rebalanceFrequency}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v) onChange({ rebalanceFrequency: v as string });
              }}
            >
              {REBALANCE_FREQUENCY_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value} sx={{ px: 2.5 }}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              成交模式
            </Typography>
            <ToggleButtonGroup
              value={form.priceMode}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v) onChange({ priceMode: v as string });
              }}
            >
              {PRICE_MODE_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value} sx={{ px: 2.5 }}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.enableTradeConstraints}
                  onChange={(e) => onChange({ enableTradeConstraints: e.target.checked })}
                  size="small"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">开启真实交易约束</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    开启后校验将依赖涨跌停 / 停牌数据，结果更贴近实盘
                  </Typography>
                </Box>
              }
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* D. 交易成本 */}
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          交易成本
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="手续费率"
              type="number"
              fullWidth
              size="small"
              value={form.commissionRate}
              onChange={(e) => onChange({ commissionRate: Number(e.target.value) })}
              slotProps={{ htmlInput: { step: 0.0001, min: 0 } }}
              helperText="例：0.0003 = 万分之三"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="印花税率"
              type="number"
              fullWidth
              size="small"
              value={form.stampDutyRate}
              onChange={(e) => onChange({ stampDutyRate: Number(e.target.value) })}
              slotProps={{ htmlInput: { step: 0.001, min: 0 } }}
              helperText="卖出时收取，例：0.001"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="最低手续费（元）"
              type="number"
              fullWidth
              size="small"
              value={form.minCommission}
              onChange={(e) => onChange({ minCommission: Number(e.target.value) })}
              helperText="每笔交易最低手续费"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              滑点（bps）：{form.slippageBps}
            </Typography>
            <Slider
              value={form.slippageBps}
              min={0}
              max={50}
              step={1}
              marks={[
                { value: 0, label: '0' },
                { value: 10, label: '10' },
                { value: 30, label: '30' },
                { value: 50, label: '50' },
              ]}
              valueLabelDisplay="auto"
              onChange={(_, v) => onChange({ slippageBps: v as number })}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* E. 仓位约束 */}
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          仓位约束
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="最大持仓数"
              type="number"
              fullWidth
              size="small"
              value={form.maxPositions}
              onChange={(e) => onChange({ maxPositions: Number(e.target.value) })}
              slotProps={{ htmlInput: { min: 1 } }}
              helperText="同时最多持有几只股票"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              单票最大权重：{(form.maxWeightPerStock * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={form.maxWeightPerStock * 100}
              min={1}
              max={100}
              step={1}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}%`}
              onChange={(_, v) => onChange({ maxWeightPerStock: (v as number) / 100 })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="最小上市天数"
              type="number"
              fullWidth
              size="small"
              value={form.minDaysListed}
              onChange={(e) => onChange({ minDaysListed: Number(e.target.value) })}
              helperText="过滤次新股，默认 60 天"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
