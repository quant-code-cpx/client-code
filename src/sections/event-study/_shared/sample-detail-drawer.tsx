import type { EventSample } from 'src/api/event-study';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  sample: EventSample | null;
  preDays: number;
};

export function SampleDetailDrawer({ open, onClose, sample, preDays }: Props) {
  const theme = useTheme();

  const arSeries = sample?.arSeries ?? [];
  const categories = arSeries.map((_, i) => {
    const offset = i - preDays;
    return offset === 0 ? '0' : String(offset);
  });

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: { categories, tickAmount: Math.min(10, categories.length) },
    yaxis: {
      labels: { formatter: (v: number) => `${(v * 100).toFixed(2)}%` },
    },
    tooltip: { y: { formatter: (v: number) => `${(v * 100).toFixed(3)}%` } },
    annotations: {
      xaxis: [
        {
          x: preDays,
          borderColor: theme.palette.error.main,
          label: {
            text: '事件日',
            style: { color: '#fff', background: theme.palette.error.main },
          },
        },
      ],
    },
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {sample?.name ?? '-'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {sample?.tsCode} · {sample?.eventDate ? fmtTradeDate(sample.eventDate) : '—'}
          </Typography>
        </Box>
        <Tooltip title="关闭">
          <IconButton onClick={onClose} size="small" aria-label="关闭">
            <Iconify icon="solar:close-circle-bold" width={20} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Divider />

      <Box sx={{ px: 3, py: 2 }}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              CAR
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'inherit',
                fontVariantNumeric: 'tabular-nums',
                color:
                  (sample?.car ?? 0) > 0
                    ? 'error.main'
                    : (sample?.car ?? 0) < 0
                      ? 'success.main'
                      : 'text.secondary',
              }}
            >
              {sample?.car != null
                ? `${sample.car > 0 ? '+' : ''}${(sample.car * 100).toFixed(2)}%`
                : '-'}
            </Typography>
          </Box>
          <Button
            component="a"
            href={`/stock/detail?code=${encodeURIComponent(sample?.tsCode ?? '')}`}
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:graph-up-bold" width={16} />}
          >
            查看个股
          </Button>
        </Stack>

        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          AR 时序
        </Typography>
        {arSeries.length > 0 ? (
          <Chart
            type="line"
            series={[{ name: 'AR', data: arSeries.map((v) => Number((v * 100).toFixed(4))) }]}
            options={chartOptions}
            sx={{ height: 240 }}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            暂无 AR 数据
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}
