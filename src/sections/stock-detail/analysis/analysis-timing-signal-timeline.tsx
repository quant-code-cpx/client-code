import type { TimingSignalItem } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import Chip from '@mui/material/Chip';
import ListItem from '@mui/material/ListItem';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

function fmtD(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

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
        <Typography variant="subtitle1" sx={{ mb: 1 }}>历史择时信号</Typography>
        {sorted.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>暂无信号数据</Typography>
        ) : (
          <List disablePadding={true}>
            {sorted.map((sig, i) => (
              <ListItem
                key={i}
                disablePadding={true}
                sx={{ py: 1.5, borderBottom: i < sorted.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">{fmtD(sig.tradeDate)}</Typography>
                    <Chip label={sig.type} color={getTypeColor(sig.type)} size="small" />
                    <Typography variant="caption">{'⭐'.repeat(Math.min(sig.strength, 5))}</Typography>
                    <Typography variant="caption" color="text.secondary">来源: {sig.source}</Typography>
                    {sig.closePrice != null && (
                      <Typography variant="caption" color="text.secondary">收盘: ¥{sig.closePrice.toFixed(2)}</Typography>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{sig.description}</Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
