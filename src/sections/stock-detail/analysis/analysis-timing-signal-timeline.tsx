import type { TimingSignalItem } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Chip from '@mui/material/Chip';
import { CardContent } from '@mui/material';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';

import { fmtTradeDate as fmtD } from 'src/utils/format-time';

// ----------------------------------------------------------------------

const TYPE_LABEL: Record<string, string> = {
  buy: '买入',
  sell: '卖出',
  warning: '警示',
  watch: '观察',
};

function getTypeColor(type: string): 'error' | 'success' | 'warning' | 'default' {
  const lower = type.toLowerCase();
  if (lower.includes('buy') || lower.includes('买') || lower.includes('多')) return 'error';
  if (lower.includes('sell') || lower.includes('卖') || lower.includes('空')) return 'success';
  if (lower.includes('warn') || lower.includes('警')) return 'warning';
  return 'default';
}

type Props = { signals: TimingSignalItem[] };

export function AnalysisTimingSignalTimeline({ signals }: Props) {
  const sorted = [...signals].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          历史择时信号
        </Typography>
        {sorted.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            暂无信号数据
          </Typography>
        ) : (
          <List disablePadding>
            {sorted.map((sig, i) => (
              <ListItem
                key={i}
                disablePadding
                sx={{
                  py: 1.5,
                  borderBottom: i < sorted.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {fmtD(sig.tradeDate)}
                    </Typography>
                    <Chip
                      label={TYPE_LABEL[sig.type.toLowerCase()] ?? sig.type}
                      color={getTypeColor(sig.type)}
                      size="small"
                    />
                    <Typography variant="caption">
                      {'⭐'.repeat(Math.min(sig.strength, 5))}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      来源: {sig.source}
                    </Typography>
                    {sig.closePrice != null && (
                      <Typography variant="caption" color="text.secondary">
                        收盘: ¥{sig.closePrice.toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {sig.description}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
