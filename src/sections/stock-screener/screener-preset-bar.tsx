import type { ScreenerPreset } from 'src/api/screener';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

// ----------------------------------------------------------------------

type ScreenerPresetBarProps = {
  presets: ScreenerPreset[];
  activePreset: string | null;
  onSelect: (preset: ScreenerPreset) => void;
  onReset: () => void;
};

// ----------------------------------------------------------------------

export function ScreenerPresetBar({ presets, activePreset, onSelect, onReset }: ScreenerPresetBarProps) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {presets.map((preset) => (
        <Tooltip key={preset.id} title={preset.description} arrow>
          <Chip
            label={preset.name}
            color={activePreset === preset.id ? 'primary' : 'default'}
            variant={activePreset === preset.id ? 'filled' : 'outlined'}
            onClick={() => onSelect(preset)}
            sx={{ cursor: 'pointer' }}
          />
        </Tooltip>
      ))}

      <Chip
        label="自定义"
        color={activePreset === 'custom' ? 'primary' : 'default'}
        variant={activePreset === 'custom' ? 'filled' : 'outlined'}
        onClick={onReset}
        sx={{ cursor: 'pointer' }}
      />
    </Stack>
  );
}
