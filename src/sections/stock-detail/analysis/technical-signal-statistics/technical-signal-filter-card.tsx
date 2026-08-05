import type {
  TechnicalSignalPeriod,
  TechnicalSignalEntryMode,
  TechnicalSignalDefinition,
} from 'src/api/technical-signal';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { DatePicker } from 'src/components/date-picker';

import { PERIOD_LABELS, DIRECTION_LABELS } from './technical-signal-formatters';

import type { TechnicalSignalStatisticsFilters } from './use-technical-signal-statistics';

// ----------------------------------------------------------------------

type Props = {
  dataAsOf?: string;
  definitions: TechnicalSignalDefinition[];
  disabled: boolean;
  filters: TechnicalSignalStatisticsFilters;
  loading: boolean;
  onApply: () => void;
  onChange: (update: Partial<TechnicalSignalStatisticsFilters>) => void;
  validationError: string | null;
};

const HORIZON_OPTIONS = [1, 3, 5, 10, 20, 30, 60];
const CUSTOM_PERIOD_MAX_YEARS = 5;
const CUSTOM_PERIOD_MAX_DATE = dayjs().endOf('day');

const fieldLabelSx = {
  display: 'block',
  mb: 0.75,
  minHeight: 18,
};

const toggleGroupSx = {
  display: 'flex',
  width: '100%',
  '& .MuiToggleButton-root': {
    flex: 1,
    minHeight: 40,
    minWidth: 0,
    px: 0.75,
    whiteSpace: 'nowrap',
  },
};

function directionColor(direction: TechnicalSignalDefinition['direction']) {
  if (direction === 'BULLISH') return 'error' as const;
  if (direction === 'BEARISH') return 'success' as const;
  return 'info' as const;
}

export function TechnicalSignalFilterCard({
  definitions,
  dataAsOf,
  disabled,
  filters,
  loading,
  onApply,
  onChange,
  validationError,
}: Props) {
  const selectedDefinitions = definitions.filter((definition) =>
    filters.signals.some(
      (selected) =>
        selected.signalKey === definition.signalKey &&
        selected.semanticsVersion === definition.semanticsVersion
    )
  );
  const includesCustomPeriod = filters.period === 'CUSTOM';
  const customPeriodMaxDate = dataAsOf ? dayjs(dataAsOf).endOf('day') : CUSTOM_PERIOD_MAX_DATE;
  const customPeriodMinDate = customPeriodMaxDate.subtract(CUSTOM_PERIOD_MAX_YEARS, 'year').startOf('day');

  return (
    <Card>
      <CardContent>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle1">历史信号统计口径</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              统计结果只使用标准技术信号目录，与旧版择时信号分开计算。
            </Typography>
          </Box>

          {validationError && <Alert severity="warning">{validationError}</Alert>}

          <Box
            sx={{
              alignItems: 'start',
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                id="technical-signal-definitions-label"
                variant="caption"
                color="text.secondary"
                sx={fieldLabelSx}
              >
                信号定义
              </Typography>
              <Autocomplete
                multiple
                disableCloseOnSelect
                disabled={disabled}
                fullWidth
                options={definitions}
                value={selectedDefinitions}
                onChange={(_, value) =>
                  onChange({
                    signals: value.map(({ signalKey, semanticsVersion }) => ({
                      signalKey,
                      semanticsVersion,
                    })),
                  })
                }
                getOptionLabel={(option) => option.displayName}
                isOptionEqualToValue={(option, value) =>
                  option.signalKey === value.signalKey && option.semanticsVersion === value.semanticsVersion
                }
                renderOption={(props, option) => (
                  <li {...props} key={`${option.signalKey}-${option.semanticsVersion}`}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {option.displayName}
                      </Typography>
                      <Chip
                        color={directionColor(option.direction)}
                        label={DIRECTION_LABELS[option.direction]}
                        size="small"
                      />
                    </Stack>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    helperText="留空时使用全部稳定定义"
                    inputProps={{
                      ...params.inputProps,
                      'aria-labelledby': 'technical-signal-definitions-label',
                    }}
                    placeholder="全部稳定定义"
                    size="small"
                  />
                )}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={fieldLabelSx}>
                统计区间
              </Typography>
              <ToggleButtonGroup
                aria-label="统计区间"
                color="primary"
                disabled={disabled}
                exclusive
                value={filters.period}
                onChange={(_, value: TechnicalSignalPeriod | null) => {
                  if (value) onChange({ period: value });
                }}
                size="small"
                sx={toggleGroupSx}
              >
                {(['1Y', '3Y', 'CUSTOM'] as TechnicalSignalPeriod[]).map((period) => (
                  <ToggleButton key={period} value={period}>
                    {PERIOD_LABELS[period]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={fieldLabelSx}>
                入场口径
              </Typography>
              <ToggleButtonGroup
                color="primary"
                disabled={disabled}
                exclusive
                value={filters.entryMode}
                onChange={(_, value: TechnicalSignalEntryMode | null) => {
                  if (value) onChange({ entryMode: value });
                }}
                size="small"
                sx={toggleGroupSx}
              >
                <ToggleButton value="SIGNAL_CLOSE">信号日收盘</ToggleButton>
                <ToggleButton value="NEXT_OPEN">次日开盘</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                id="technical-signal-horizons-label"
                variant="caption"
                color="text.secondary"
                sx={fieldLabelSx}
              >
                观察周期
              </Typography>
              <Select
                aria-labelledby="technical-signal-horizons-label"
                disabled={disabled}
                fullWidth
                multiple
                value={filters.horizons}
                onChange={(event) => {
                  const nextValues = event.target.value;
                  const horizons = (typeof nextValues === 'string'
                    ? nextValues.split(',').map(Number)
                    : nextValues
                  ) as number[];
                  onChange({ horizons });
                }}
                renderValue={(values) => (values as number[]).map((value) => `T+${value}`).join('、')}
                size="small"
              >
                {HORIZON_OPTIONS.map((value) => (
                  <MenuItem key={value} value={value}>
                    T+{value}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          {includesCustomPeriod && (
            <Stack direction="row" spacing={2}>
              <DatePicker
                disabled={disabled}
                label="自定义开始日"
                maxDate={filters.customEndDate ? dayjs(filters.customEndDate) : customPeriodMaxDate}
                minDate={customPeriodMinDate}
                onChange={(value) =>
                  onChange({ customStartDate: value?.format('YYYY-MM-DD') ?? '' })
                }
                slotProps={{ textField: { fullWidth: true, helperText: '仅支持最近 5 年' } }}
                sx={{ flex: 1 }}
                value={filters.customStartDate ? dayjs(filters.customStartDate) : null}
              />
              <DatePicker
                disabled={disabled}
                label="自定义结束日"
                maxDate={customPeriodMaxDate}
                minDate={filters.customStartDate ? dayjs(filters.customStartDate) : customPeriodMinDate}
                onChange={(value) => onChange({ customEndDate: value?.format('YYYY-MM-DD') ?? '' })}
                slotProps={{ textField: { fullWidth: true, helperText: '仅支持最近 5 年' } }}
                sx={{ flex: 1 }}
                value={filters.customEndDate ? dayjs(filters.customEndDate) : null}
              />
            </Stack>
          )}

          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.includeBenchmark}
                  disabled={disabled}
                  onChange={(event) => onChange({ includeBenchmark: event.target.checked })}
                />
              }
              label="对比沪深 300 超额收益"
            />
            <Button disabled={disabled || loading} onClick={onApply} variant="contained">
              {loading ? '正在计算…' : '应用筛选'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
