import type { FactorDef } from 'src/api/factor';

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

  return (
    <Box
      sx={{
        position: 'relative',
        px: 2,
        py: 1.5,
        mb: 3,
        borderRadius: 1.5,
        bgcolor: (t) => varAlpha(t.vars.palette.grey['500Channel'], 0.04),
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 8,
          bottom: 8,
          width: 2,
          borderRadius: 1,
          bgcolor: 'primary.main',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { md: 'center' }, pl: 1 }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ minWidth: 64 }}>
          分析上下文
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
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
          onChange={(_, v) => onFactorsChange(v)}
          options={allFactors.map((f) => f.name)}
          getOptionLabel={(name) => {
            const f = allFactors.find((x) => x.name === name);
            return f ? `${name} · ${f.label}` : name;
          }}
          renderInput={(p) => <TextField {...p} label="共享因子集（≥1）" />}
          renderTags={(value, getTagProps) =>
            value.map((name, index) => (
              <Chip label={name} {...getTagProps({ index })} key={name} size="small" />
            ))
          }
          sx={{ flexGrow: 1, minWidth: 320 }}
        />
      </Stack>
    </Box>
  );
}
