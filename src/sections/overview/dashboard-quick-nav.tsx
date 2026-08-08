import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  {
    icon: 'solar:star-bold',
    label: '自选股',
    path: '/research/watchlist',
    color: 'warning',
  },
  {
    icon: 'solar:chart-2-bold',
    label: '市场概览',
    path: '/market/overview',
    color: 'info',
  },
  {
    icon: 'solar:widget-bold',
    label: '热力图',
    path: '/market/heatmap',
    color: 'error',
  },
  {
    icon: 'solar:filter-bold',
    label: '选股器',
    path: '/stock',
    color: 'primary',
  },
  {
    icon: 'solar:playback-speed-bold',
    label: '回测工作台',
    path: '/backtest',
    color: 'secondary',
  },
  {
    icon: 'solar:layers-bold',
    label: '策略管理',
    path: '/strategy',
    color: 'success',
  },
  {
    icon: 'solar:graph-up-bold',
    label: '因子市场',
    path: '/factor/library',
    color: 'info',
  },
  {
    icon: 'solar:bell-bold',
    label: '预警监控',
    path: '/alert/price-rules',
    color: 'warning',
  },
  {
    icon: 'solar:notebook-bookmark-bold',
    label: '研究笔记',
    path: '/research/notes',
    color: 'secondary',
  },
  {
    icon: 'solar:document-text-bold',
    label: '量化报告',
    path: '/research/report',
    color: 'primary',
  },
  {
    icon: 'solar:shuffle-bold',
    label: '行业轮动',
    path: '/market/industry-rotation',
    color: 'error',
  },
  {
    icon: 'solar:calendar-bold',
    label: '事件日历',
    path: '/alert',
    color: 'success',
  },
] as const;

// ----------------------------------------------------------------------

export function DashboardQuickNav() {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        快速导航
      </Typography>
      <Grid container spacing={1.5}>
        {NAV_ITEMS.map((item) => {
          const paletteColor = theme.palette[item.color as keyof typeof theme.palette] as {
            main: string;
            mainChannel: string;
          };

          return (
            <Grid key={item.path} size={{ xs: 4, sm: 3, md: 2, lg: 1.5 }}>
              <Card
                sx={{
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'transparent',
                  boxShadow: 'none',
                  bgcolor: varAlpha(paletteColor.mainChannel, 0.04),
                  transition: theme.transitions.create(
                    ['background-color', 'border-color', 'box-shadow', 'transform'],
                    { duration: theme.transitions.duration.shorter }
                  ),
                  '&:hover': {
                    borderColor: paletteColor.main,
                    bgcolor: varAlpha(paletteColor.mainChannel, 0.1),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${varAlpha(paletteColor.mainChannel, 0.16)}`,
                  },
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  href={item.path}
                  aria-label={`前往${item.label}`}
                  sx={{
                    py: 2,
                    px: 1,
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: -2,
                    },
                  }}
                >
                  <Iconify
                    icon={item.icon as any}
                    width={24}
                    sx={{
                      color: paletteColor.main,
                      mb: 0.75,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, fontSize: 12, display: 'block' }}
                  >
                    {item.label}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
