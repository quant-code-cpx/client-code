import type { MarketAnomaly } from 'src/api/alert';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

function renderDetail(anomaly: MarketAnomaly) {
  const d = anomaly.detail as Record<string, unknown>;

  switch (anomaly.anomalyType) {
    case 'VOLUME_SURGE':
      return (
        <>
          <Row label="当日成交量" value={`${(Number(d.vol) / 10000).toFixed(2)} 万手`} />
          <Row label="20日均量" value={`${(Number(d.avg20Vol) / 10000).toFixed(2)} 万手`} />
          <Row label="放量倍数" value={`${Number(d.ratio).toFixed(2)}x`} />
        </>
      );
    case 'CONSECUTIVE_LIMIT_UP':
      return <Row label="连续涨停天数" value={`${d.consecutiveDays} 天`} />;
    case 'LARGE_NET_INFLOW':
      return (
        <>
          <Row label="主力买入" value={`${(Number(d.buyElgAmount) / 1e8).toFixed(2)} 亿元`} />
          <Row label="主力卖出" value={`${(Number(d.sellElgAmount) / 1e8).toFixed(2)} 亿元`} />
          <Row label="净流入" value={`${(Number(d.netElg) / 1e8).toFixed(2)} 亿元`} />
          <Row label="成交额" value={`${(Number(d.amount) / 1e8).toFixed(2)} 亿元`} />
        </>
      );
    default:
      return (
        <Typography variant="body2" color="text.secondary">
          暂无详情
        </Typography>
      );
  }
}

// ----------------------------------------------------------------------

type Props = {
  anchorEl: HTMLElement | null;
  anomaly: MarketAnomaly | null;
  onClose: () => void;
};

export function AlertAnomalyDetailPopover({ anchorEl, anomaly, onClose }: Props) {
  const open = Boolean(anchorEl) && Boolean(anomaly);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { p: 2, minWidth: 220, maxWidth: 300 } } }}
    >
      {anomaly && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            {anomaly.stockName} ({anomaly.tsCode})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {anomaly.tradeDate}
          </Typography>
          <Divider sx={{ my: 1 }} />
          {renderDetail(anomaly)}
        </>
      )}
    </Popover>
  );
}
