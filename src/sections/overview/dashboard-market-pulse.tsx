import type { IndexQuoteWithSparklineItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { INDEX_NAME_MAP } from 'src/utils/market-index-names';
import { fPercent, fShortenNumber } from 'src/utils/format-number';

import { fetchIndexQuoteWithSparkline } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { ChartSparkline } from 'src/components/chart-sparkline';

// ----------------------------------------------------------------------

/** 可供选择的指数目录 */
const INDEX_CATALOG = [
  { code: '000001.SH', name: '上证指数', group: '上交所' },
  { code: '000010.SH', name: '上证180', group: '上交所' },
  { code: '000688.SH', name: '科创50', group: '上交所' },
  { code: '000698.SH', name: '科创100', group: '上交所' },
  { code: '399001.SZ', name: '深证成指', group: '深交所' },
  { code: '399006.SZ', name: '创业板指', group: '深交所' },
  { code: '399673.SZ', name: '创业板50', group: '深交所' },
  { code: '399005.SZ', name: '中小100', group: '深交所' },
  { code: '000300.SH', name: '沪深300', group: '沪深宽基' },
  { code: '000016.SH', name: '上证50', group: '沪深宽基' },
  { code: '000905.SH', name: '中证500', group: '沪深宽基' },
  { code: '000852.SH', name: '中证1000', group: '沪深宽基' },
  { code: '899050.BJ', name: '北证50', group: '北交所' },
];

const MAX_SELECTED = 6;
const STORAGE_KEY = 'dashboard.pulse-selection';
const DEFAULT_CODES = ['000001.SH', '399001.SZ', '399006.SZ', '000688.SH'];

// INDEX_NAME_MAP imported from src/utils/market-index-names; kept local catalog for selection UI
const CODE_TO_NAME = Object.fromEntries(INDEX_CATALOG.map(({ code, name }) => [code, name]));

function loadSelected(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.length <= MAX_SELECTED &&
        parsed.every((c) => typeof c === 'string')
      ) {
        return parsed as string[];
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CODES;
}

function saveSelected(codes: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

function PulseCard({ item }: { item: IndexQuoteWithSparklineItem }) {
  const theme = useTheme();
  const pct = item.pctChg ?? 0;
  const isUp = pct > 0;
  const isFlat = pct === 0;
  const color = isFlat
    ? theme.palette.text.secondary
    : isUp
      ? theme.palette.error.main
      : theme.palette.success.main;

  const name = item.name || INDEX_NAME_MAP[item.tsCode] || CODE_TO_NAME[item.tsCode] || item.tsCode;

  return (
    <Card
      sx={{
        px: 2,
        py: 1.5,
        minWidth: 200,
        flex: '1 1 0',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        transition: 'border-color 0.2s',
        '&:hover': {
          borderColor: color,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, fontSize: 12 }}
          >
            {name}
          </Typography>

          <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 0.25 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {item.close?.toFixed(2) ?? '—'}
            </Typography>
            <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: 12 }}>
              {isUp ? '+' : ''}
              {fPercent(pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Stack>

          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', fontSize: 12, mt: 0.25, display: 'block' }}
          >
            成交量&nbsp;{fShortenNumber((item.amount ?? 0) * 1000 || 0)}
          </Typography>
        </Box>

        <Box sx={{ flexShrink: 0, opacity: 0.75 }}>
          <ChartSparkline data={item.sparkline ?? []} color={color} height={28} />
        </Box>
      </Stack>
    </Card>
  );
}

// ----------------------------------------------------------------------

type SelectionDialogProps = {
  open: boolean;
  selected: string[];
  onClose: () => void;
  onConfirm: (codes: string[]) => void;
};

function PulseSelectionDialog({ open, selected, onClose, onConfirm }: SelectionDialogProps) {
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  const toggle = (code: string) => {
    setDraft((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, code];
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        自定义指数卡片
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          最多选择 {MAX_SELECTED} 个，已选 {draft.length} 个
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        {Array.from(new Set(INDEX_CATALOG.map((i) => i.group))).map((group) => (
          <Box key={group} sx={{ mb: 1 }}>
            <Typography
              variant="overline"
              sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}
            >
              {group}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {INDEX_CATALOG.filter((i) => i.group === group).map(({ code, name }) => {
                const checked = draft.includes(code);
                const disabled = !checked && draft.length >= MAX_SELECTED;
                return (
                  <FormControlLabel
                    key={code}
                    disabled={disabled}
                    sx={{ m: 0 }}
                    control={
                      <Checkbox checked={checked} onChange={() => toggle(code)} size="small" />
                    }
                    label={name}
                  />
                );
              })}
            </Box>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          取消
        </Button>
        <Button variant="contained" disabled={draft.length === 0} onClick={() => onConfirm(draft)}>
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

export function DashboardMarketPulse({ refreshKey }: { refreshKey?: number }) {
  const [allIndices, setAllIndices] = useState<IndexQuoteWithSparklineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(loadSelected);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchIndexQuoteWithSparkline({ sparkline_period: '1m' })
      .then((res) => setAllIndices(res.indices ?? []))
      .catch(() => setAllIndices([]))
      .finally(() => setLoading(false));
     
  }, [refreshKey]);

  const handleConfirm = (codes: string[]) => {
    saveSelected(codes);
    setSelectedCodes(codes);
    setDialogOpen(false);
  };

  // Filter to selected codes, preserve user's ordering
  const displayIndices = selectedCodes
    .map((code) => allIndices.find((item) => item.tsCode === code))
    .filter((item): item is IndexQuoteWithSparklineItem => item != null);

  if (loading) {
    return (
      <Stack direction="row" spacing={2}>
        {selectedCodes.map((code) => (
          <Skeleton key={code} variant="rounded" width={170} height={80} />
        ))}
      </Stack>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>
          指数行情
        </Typography>
        <Tooltip title="自定义指数卡片">
          <IconButton size="small" onClick={() => setDialogOpen(true)}>
            <Iconify icon="solar:pen-bold" width={18} />
          </IconButton>
        </Tooltip>
      </Box>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          overflowX: 'auto',
          pb: 0.5,
          '::-webkit-scrollbar': { height: 4 },
          '::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
        }}
      >
        {displayIndices.length > 0
          ? displayIndices.map((item) => <PulseCard key={item.tsCode} item={item} />)
          : selectedCodes.map((code) => (
              <Card key={code} sx={{ px: 2, py: 1.5, minWidth: 170, flex: '1 1 0' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {CODE_TO_NAME[code] ?? code}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
                  暂无数据
                </Typography>
              </Card>
            ))}
      </Stack>

      <PulseSelectionDialog
        open={dialogOpen}
        selected={selectedCodes}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
