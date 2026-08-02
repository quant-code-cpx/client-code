import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

import type {
  MarketPeriod,
  MarketAdjustType,
  MarketSubIndicator,
  MarketMainIndicator,
} from './market-kline.types';

type Props = {
  period: MarketPeriod;
  adjustType: MarketAdjustType;
  mainIndicator: MarketMainIndicator;
  subIndicator: MarketSubIndicator;
  onPeriodChange: (value: MarketPeriod) => void;
  onAdjustTypeChange: (value: MarketAdjustType) => void;
  onMainIndicatorChange: (value: MarketMainIndicator) => void;
  onSubIndicatorChange: (value: MarketSubIndicator) => void;
  onReset: () => void;
};

export function MarketChartToolbar({
  period,
  adjustType,
  mainIndicator,
  subIndicator,
  onPeriodChange,
  onAdjustTypeChange,
  onMainIndicatorChange,
  onSubIndicatorChange,
  onReset,
}: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.25,
        mb: 1.5,
      }}
    >
      <ToggleButtonGroup
        value={period}
        exclusive
        size="small"
        aria-label="行情周期"
        onChange={(_, value: MarketPeriod | null) => {
          if (value) onPeriodChange(value);
        }}
      >
        <ToggleButton value="T">分时</ToggleButton>
        <ToggleButton value="D">日</ToggleButton>
        <ToggleButton value="W">周</ToggleButton>
        <ToggleButton value="M">月</ToggleButton>
      </ToggleButtonGroup>

      {period !== 'T' ? (
        <FormControl size="small" sx={{ minWidth: 112 }}>
          <InputLabel id="market-adjust-label">复权方式</InputLabel>
          <Select
            labelId="market-adjust-label"
            label="复权方式"
            value={adjustType}
            onChange={(event) => onAdjustTypeChange(event.target.value as MarketAdjustType)}
          >
            <MenuItem value="qfq">前复权</MenuItem>
            <MenuItem value="hfq">后复权</MenuItem>
            <MenuItem value="none">不复权</MenuItem>
          </Select>
        </FormControl>
      ) : null}

      <FormControl size="small" sx={{ minWidth: 104 }} disabled={period === 'T'}>
        <InputLabel id="market-main-indicator-label">主图指标</InputLabel>
        <Select
          labelId="market-main-indicator-label"
          label="主图指标"
          value={period === 'T' ? 'NONE' : mainIndicator}
          onChange={(event) => onMainIndicatorChange(event.target.value as MarketMainIndicator)}
        >
          <MenuItem value="MA">MA</MenuItem>
          <MenuItem value="BOLL">BOLL</MenuItem>
          <MenuItem value="NONE">无</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 104 }}>
        <InputLabel id="market-sub-indicator-label">副图指标</InputLabel>
        <Select
          labelId="market-sub-indicator-label"
          label="副图指标"
          value={subIndicator}
          onChange={(event) => onSubIndicatorChange(event.target.value as MarketSubIndicator)}
        >
          <MenuItem value="VOL">VOL</MenuItem>
          <MenuItem value="MACD">MACD</MenuItem>
          <MenuItem value="KDJ">KDJ</MenuItem>
          <MenuItem value="RSI">RSI</MenuItem>
          <MenuItem value="NONE">无</MenuItem>
        </Select>
      </FormControl>

      <Button
        size="small"
        color="inherit"
        startIcon={<Iconify icon="solar:restart-bold" />}
        onClick={onReset}
        sx={{ ml: { sm: 'auto' } }}
      >
        重置视图
      </Button>
    </Box>
  );
}
