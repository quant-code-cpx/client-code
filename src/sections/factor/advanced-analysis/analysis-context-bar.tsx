import type { FactorDef } from 'src/api/factor';

import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import ListSubheader from '@mui/material/ListSubheader';

import { UNIVERSE_OPTIONS } from './constants';

// ----------------------------------------------------------------------
// 共享上下文条 — Universe + 因子集（不含日期；日期由各 Tab 自行管理）
// ----------------------------------------------------------------------

type Props = {
  universe: string;
  onUniverseChange: (v: string) => void;
  factors: string[];
  onFactorsChange: (v: string[]) => void;
  allFactors: FactorDef[];
};

export function AnalysisContextBar({
  universe,
  onUniverseChange,
  factors,
  onFactorsChange,
  allFactors,
}: Props) {
  const groups = Array.from(new Set(UNIVERSE_OPTIONS.map((o) => o.group)));
  const factorLabelMap = useMemo(
    () => new Map(allFactors.map((factor) => [factor.name, factor.label])),
    [allFactors]
  );
  const factorOptions = useMemo(
    () => Array.from(new Set([...factors, ...allFactors.map((factor) => factor.name)])),
    [allFactors, factors]
  );

  return (
    <Box
      sx={{
        position: 'relative',
        px: { xs: 1.5, md: 2 },
        py: 1.5,
        borderRadius: 1,
        overflow: 'hidden',
        border: (theme) => `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.16)}`,
        bgcolor: 'background.paper',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: 'primary.main',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'stretch', md: 'center' }, flexWrap: 'wrap', pl: { xs: 1, md: 1.5 } }}
      >
        <Stack
          direction={{ xs: 'row', md: 'column' }}
          spacing={{ xs: 1, md: 0 }}
          sx={{
            minWidth: { md: 88 },
            alignItems: { xs: 'center', md: 'flex-start' },
            justifyContent: 'center',
          }}
        >
          <Typography variant="overline" color="text.secondary">
            分析上下文
          </Typography>
          <Typography variant="caption" color="text.secondary">
            已选 {factors.length} 个
          </Typography>
        </Stack>
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 220 }, flexShrink: 0 }}>
          <InputLabel>股票池 Universe</InputLabel>
          <Select
            value={universe}
            label="股票池 Universe"
            onChange={(e) => onUniverseChange(e.target.value)}
            renderValue={(v) => UNIVERSE_OPTIONS.find((o) => o.value === v)?.label ?? v ?? '全市场'}
          >
            {groups.flatMap((g) => [
              <ListSubheader key={`h-${g}`}>{g}</ListSubheader>,
              ...UNIVERSE_OPTIONS.filter((o) => o.group === g).map((o) => (
                <MenuItem key={o.value || 'all'} value={o.value}>
                  {o.label}
                </MenuItem>
              )),
            ])}
          </Select>
        </FormControl>

        <Autocomplete
          multiple
          size="small"
          value={factors}
          limitTags={3}
          filterSelectedOptions
          onChange={(_, v) => onFactorsChange(v)}
          options={factorOptions}
          isOptionEqualToValue={(option, value) => option === value}
          getOptionLabel={(name) => {
            const label = factorLabelMap.get(name);
            return label ? `${name} · ${label}` : name;
          }}
          renderInput={(p) => (
            <TextField
              {...p}
              label="共享因子集"
              placeholder={factors.length > 0 ? '' : '输入因子名或中文名…'}
            />
          )}
          renderValue={(value, getItemProps) =>
            value.map((name, index) => {
              const { key, ...itemProps } = getItemProps({ index });
              return (
                <Chip
                  key={key}
                  label={name}
                  {...itemProps}
                  size="small"
                  sx={{ maxWidth: 160 }}
                />
              );
            })
          }
          sx={{
            width: { xs: '100%', sm: 420, md: 520 },
            maxWidth: { md: 560 },
            flexShrink: 0,
          }}
        />
      </Stack>
    </Box>
  );
}
