import type { IndexQuoteItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CardActionArea from '@mui/material/CardActionArea';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'src/routes/hooks';

import { fPctChg, fQianYuan } from 'src/utils/format-number';

import { fetchIndexQuote } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** 可供选择的指数目录，按市场分组 */
const INDEX_CATALOG = [
  // 沪深宽基
  { code: '000300.SH', name: '沪深300', group: '沪深宽基' },
  { code: '000016.SH', name: '上证50', group: '沪深宽基' },
  { code: '000903.SH', name: '中证100', group: '沪深宽基' },
  { code: '000905.SH', name: '中证500', group: '沪深宽基' },
  { code: '000852.SH', name: '中证1000', group: '沪深宽基' },
  { code: '932000.CSI', name: '中证2000', group: '沪深宽基' },
  { code: '000985.SH', name: '中证全指', group: '沪深宽基' },
  // 上交所
  { code: '000001.SH', name: '上证指数', group: '上交所' },
  { code: '000010.SH', name: '上证180', group: '上交所' },
  { code: '000688.SH', name: '科创50', group: '上交所' },
  { code: '000698.SH', name: '科创100', group: '上交所' },
  // 深交所
  { code: '399001.SZ', name: '深证成指', group: '深交所' },
  { code: '399107.SZ', name: '深证综指', group: '深交所' },
  { code: '399330.SZ', name: '深证100', group: '深交所' },
  { code: '399006.SZ', name: '创业板指', group: '深交所' },
  { code: '399673.SZ', name: '创业板50', group: '深交所' },
  { code: '399005.SZ', name: '中小100', group: '深交所' },
  // 北交所
  { code: '899050.BJ', name: '北证50', group: '北交所' },
];

const MAX_SELECTED = 4;
const STORAGE_KEY = 'dashboard.index-selection';
const DEFAULT_CODES = ['000300.SH', '000905.SH', '000001.SH', '399001.SZ'];

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
    // ignore parse errors
  }
  return DEFAULT_CODES;
}

function saveSelected(codes: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

// ----------------------------------------------------------------------

function IndexCard({ item }: { item: IndexQuoteItem }) {
  const router = useRouter();
  const name = CODE_TO_NAME[item.tsCode] ?? item.tsCode;
  const pct = item.pctChg ?? 0;

  let pctColor: 'error.main' | 'success.main' | 'text.secondary' = 'text.secondary';
  if (pct > 0) pctColor = 'error.main';
  else if (pct < 0) pctColor = 'success.main';

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea sx={{ height: '100%' }} onClick={() => router.push('/market/overview')}>
        <CardContent>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {name}
          </Typography>
          <Typography variant="h5" fontWeight="fontWeightBold" sx={{ mb: 0.5 }}>
            {item.close != null ? item.close.toFixed(2) : '-'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" fontWeight="fontWeightMedium" sx={{ color: pctColor }}>
              {item.pctChg != null ? fPctChg(item.pctChg) : '-'}
            </Typography>
            <Typography variant="caption" sx={{ color: pctColor }}>
              {item.change != null ? `${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}` : '-'}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
            成交额&nbsp;{item.amount != null ? fQianYuan(item.amount) : '-'}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function IndexCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="55%" />
      </CardContent>
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

function IndexSelectionDialog({ open, selected, onClose, onConfirm }: SelectionDialogProps) {
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
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

export function DashboardIndexCards() {
  const [data, setData] = useState<IndexQuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>(loadSelected);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchIndexQuote({ ts_codes: selectedCodes })
      .then((res) => {
        if (!cancelled) setData(res ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载指数行情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCodes]);

  const handleConfirm = (codes: string[]) => {
    saveSelected(codes);
    setSelectedCodes(codes);
    setDialogOpen(false);
  };

  const cardCodes = loading ? selectedCodes : selectedCodes;

  return (
    <>
      {/* 设置按钮行 */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="自定义指数卡片">
            <IconButton size="small" onClick={() => setDialogOpen(true)}>
              <Iconify icon="solar:pen-bold" width={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Grid>

      {/* 指数卡片 */}
      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      ) : loading ? (
        cardCodes.map((code) => (
          <Grid key={code} size={{ xs: 12, sm: 6, md: 3 }}>
            <IndexCardSkeleton />
          </Grid>
        ))
      ) : (
        selectedCodes.map((code) => {
          const item = data.find((d) => d.tsCode === code);
          return (
            <Grid key={code} size={{ xs: 12, sm: 6, md: 3 }}>
              {item ? (
                <IndexCard item={item} />
              ) : (
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      {CODE_TO_NAME[code] ?? code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      暂无数据
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          );
        })
      )}

      <IndexSelectionDialog
        open={dialogOpen}
        selected={selectedCodes}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
