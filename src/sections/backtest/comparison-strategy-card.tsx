import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';

import { Iconify } from 'src/components/iconify';

import { BacktestStrategyConfigPanel } from './backtest-strategy-config-panel';
import { STRATEGY_TYPE_OPTIONS, REBALANCE_FREQUENCY_OPTIONS } from './constants';

import type { BacktestRunForm , ComparisonStrategyFormItem } from './types';

// ----------------------------------------------------------------------

type Props = {
  index: number;
  item: ComparisonStrategyFormItem;
  onChange: (patch: Partial<ComparisonStrategyFormItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
};

export function ComparisonStrategyCard({ index, item, onChange, onRemove, canRemove }: Props) {
  // Adapt to BacktestStrategyConfigPanel's interface
  const fakeForm: BacktestRunForm = {
    name: '',
    startDate: '',
    endDate: '',
    initialCapital: 1000000,
    benchmarkTsCode: '000300.SH',
    universe: 'HS300',
    customUniverseTsCodes: [],
    rebalanceFrequency: item.rebalanceFrequency,
    priceMode: 'NEXT_OPEN',
    enableTradeConstraints: false,
    commissionRate: 0.0003,
    stampDutyRate: 0.0005,
    minCommission: 5,
    slippageBps: 5,
    maxPositions: 20,
    maxWeightPerStock: 0.1,
    minDaysListed: 60,
    strategyConfig: item.strategyConfig,
  };

  const handleConfigChange = useCallback(
    (updates: Partial<BacktestRunForm>) => {
      if (updates.strategyConfig !== undefined) {
        onChange({ strategyConfig: updates.strategyConfig });
      }
    },
    [onChange]
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            策略 {index + 1}
          </Typography>
          {canRemove && (
            <IconButton size="small" color="error" onClick={onRemove}>
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="策略标签 (可选)"
            value={item.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={`策略 ${index + 1}`}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>策略类型</InputLabel>
              <Select
                label="策略类型"
                value={item.strategyType}
                onChange={(e) => onChange({ strategyType: e.target.value, strategyConfig: {} })}
              >
                {STRATEGY_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>调仓频率</InputLabel>
              <Select
                label="调仓频率"
                value={item.rebalanceFrequency}
                onChange={(e) => onChange({ rebalanceFrequency: e.target.value })}
              >
                {REBALANCE_FREQUENCY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <BacktestStrategyConfigPanel
            selectedTemplateId={item.strategyType}
            form={fakeForm}
            onChange={handleConfigChange}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
