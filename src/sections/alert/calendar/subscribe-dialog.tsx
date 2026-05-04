import type { Watchlist } from 'src/api/watchlist';
import type { EventType, CalendarEvent, PriceAlertRuleType } from 'src/api/alert';

import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { alertApi } from 'src/api/alert';
import { getWatchlists } from 'src/api/watchlist';

import { Iconify } from 'src/components/iconify';

import { EVENT_TYPE_LIST } from './event-type-config';

// ----------------------------------------------------------------------

const TRIGGER_WINDOW_OPTIONS = [
  { value: 0, label: '事件当日' },
  { value: 1, label: '提前 1 天' },
  { value: 3, label: '提前 3 天' },
  { value: 7, label: '提前 7 天' },
];

type SubscribeScope = 'STOCK' | 'WATCHLIST';

type Props = {
  open: boolean;
  /** 单事件订阅或批量事件订阅 */
  events: CalendarEvent[];
  onClose: () => void;
  onSuccess?: () => void;
};

function eventTypeToRule(type: EventType): PriceAlertRuleType {
  return `EVENT_${type}` as PriceAlertRuleType;
}

export function SubscribeDialog({ open, events, onClose, onSuccess }: Props) {
  const single = events.length === 1 ? events[0] : null;

  const [scope, setScope] = useState<SubscribeScope>('STOCK');
  const [eventType, setEventType] = useState<EventType | 'ANY'>(single?.type ?? 'ANY');
  const [triggerWindow, setTriggerWindow] = useState<number>(0);
  const [watchlistId, setWatchlistId] = useState<number | ''>('');
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setScope('STOCK');
    setEventType(single?.type ?? 'ANY');
    setTriggerWindow(0);
    setError(null);
    getWatchlists()
      .then((list) => setWatchlists(list))
      .catch(() => {
        // 忽略 watchlist 加载错误，仅影响 WATCHLIST 范围选项
      });
  }, [open, single]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const ruleType: PriceAlertRuleType =
        eventType === 'ANY' ? 'EVENT_ANY' : eventTypeToRule(eventType);

      if (events.length > 1) {
        // 批量：为每只股票创建一条规则
        const uniqCodes = Array.from(new Set(events.map((e) => e.tsCode)));
        await Promise.all(
          uniqCodes.map((tsCode) =>
            alertApi.createPriceRule({
              tsCode,
              ruleType,
              threshold: triggerWindow,
              memo: JSON.stringify({ source: 'calendar', kind: 'event' }),
            })
          )
        );
      } else if (scope === 'WATCHLIST' && watchlistId !== '') {
        await alertApi.createPriceRule({
          watchlistId: Number(watchlistId),
          ruleType,
          threshold: triggerWindow,
          memo: JSON.stringify({ source: 'calendar', kind: 'event' }),
        });
      } else if (single) {
        await alertApi.createPriceRule({
          tsCode: single.tsCode,
          ruleType,
          threshold: triggerWindow,
          memo: JSON.stringify({
            source: 'calendar',
            kind: 'event',
            eventDate: single.date,
          }),
        });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '订阅失败');
    } finally {
      setSubmitting(false);
    }
  };

  const isBatch = events.length > 1;

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isBatch ? '批量订阅事件提醒' : '订阅事件提醒'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {single && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                目标股票
              </Typography>
              <Typography variant="body2">
                {single.stockName} · {single.tsCode}
              </Typography>
            </Stack>
          )}
          {isBatch && (
            <Typography variant="body2" color="text.secondary">
              将为选中的 {Array.from(new Set(events.map((e) => e.tsCode))).length}{' '}
              只股票分别创建提醒规则
            </Typography>
          )}

          {single && (
            <TextField
              select
              size="small"
              label="订阅范围"
              value={scope}
              onChange={(e) => setScope(e.target.value as SubscribeScope)}
            >
              <MenuItem value="STOCK">仅此股票</MenuItem>
              <MenuItem value="WATCHLIST">关联自选股组</MenuItem>
            </TextField>
          )}

          {single && scope === 'WATCHLIST' && (
            <TextField
              select
              size="small"
              label="自选股组"
              value={watchlistId}
              onChange={(e) => setWatchlistId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value="">请选择…</MenuItem>
              {watchlists.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            size="small"
            label="事件类型"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType | 'ANY')}
          >
            <MenuItem value="ANY">全部事件类型</MenuItem>
            {EVENT_TYPE_LIST.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="提醒时机"
            value={triggerWindow}
            onChange={(e) => setTriggerWindow(Number(e.target.value))}
            helperText="距事件日的提前天数"
          >
            {TRIGGER_WINDOW_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || (scope === 'WATCHLIST' && watchlistId === '' && !isBatch)}
          startIcon={
            submitting ? (
              <CircularProgress size={16} />
            ) : (
              <Iconify icon="solar:bell-bold" width={18} />
            )
          }
        >
          {submitting ? '订阅中…' : '确认订阅'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
