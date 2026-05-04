import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';

import { getWatchlists, getWatchlistStocks } from 'src/api/watchlist';

import { parseTsCodes } from '../../utils';
import { BE_PENDING_TOOLTIP } from '../../constants';

// ----------------------------------------------------------------------
// 股票池选择器：自选股 / 选股器结果（待 BE-5）/ 手动粘贴
// ----------------------------------------------------------------------

type Watchlist = { id: number; name: string };

type Props = {
  value: string[];
  onChange: (codes: string[]) => void;
};

export function StockUniverseSelector({ value, onChange }: Props) {
  const [tab, setTab] = useState<'watchlist' | 'screening' | 'paste'>('watchlist');

  // ---- watchlist ----
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [watchlistId, setWatchlistId] = useState<number | ''>('');
  const [watchlistError, setWatchlistError] = useState('');

  useEffect(() => {
    getWatchlists()
      .then((lists) => setWatchlists(lists.map((l) => ({ id: l.id, name: l.name }))))
      .catch((e) => setWatchlistError(e instanceof Error ? e.message : '加载自选股失败'));
  }, []);

  const handleSelectWatchlist = useCallback(
    async (id: number) => {
      setWatchlistId(id);
      try {
        const res = await getWatchlistStocks(id);
        const codes = res.stocks.map((s) => s.tsCode);
        onChange(codes);
      } catch (e) {
        setWatchlistError(e instanceof Error ? e.message : '加载自选股股票失败');
      }
    },
    [onChange]
  );

  // ---- paste ----
  const [pasteText, setPasteText] = useState(value.join('\n'));
  const [invalidTokens, setInvalidTokens] = useState<string[]>([]);

  const handlePasteChange = useCallback(
    (text: string) => {
      setPasteText(text);
      const { valid, invalid } = parseTsCodes(text);
      setInvalidTokens(invalid);
      onChange(valid);
    },
    [onChange]
  );

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="watchlist" label="自选股" />
        <Tab
          value="screening"
          label="选股器结果"
          disabled
          sx={{
            '&.Mui-disabled': { opacity: 0.5 },
          }}
        />
        <Tab value="paste" label="手动粘贴" />
      </Tabs>

      {tab === 'watchlist' && (
        <Stack spacing={1.5}>
          {watchlistError && <Alert severity="error">{watchlistError}</Alert>}
          <FormControl size="small" sx={{ maxWidth: 320 }}>
            <InputLabel>自选股分组</InputLabel>
            <Select
              value={watchlistId}
              label="自选股分组"
              onChange={(e) => handleSelectWatchlist(Number(e.target.value))}
            >
              {watchlists.length === 0 && (
                <MenuItem value="" disabled>
                  暂无自选股分组
                </MenuItem>
              )}
              {watchlists.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            已导入 {value.length} 只股票
          </Typography>
        </Stack>
      )}

      {tab === 'screening' && (
        <Tooltip title={BE_PENDING_TOOLTIP + '（BE-5：选股器最近结果列表）'}>
          <Box sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>
            选股器结果导入暂未对接，请先用「自选股」或「手动粘贴」
          </Box>
        </Tooltip>
      )}

      {tab === 'paste' && (
        <Stack spacing={1.5}>
          <TextField
            label="股票代码列表"
            value={pasteText}
            onChange={(e) => handlePasteChange(e.target.value)}
            multiline
            minRows={3}
            maxRows={6}
            fullWidth
            placeholder="支持 6 位数字 + .SH/.SZ/.BJ；逗号 / 换行 / 空格分隔，如 000001.SZ, 600036.SH"
          />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              已识别 {value.length} 只
            </Typography>
            {invalidTokens.length > 0 && (
              <>
                <Typography variant="caption" color="warning.darker">
                  {invalidTokens.length} 个无效:
                </Typography>
                {invalidTokens.slice(0, 5).map((t) => (
                  <Chip key={t} label={t} size="small" color="warning" variant="outlined" />
                ))}
              </>
            )}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
