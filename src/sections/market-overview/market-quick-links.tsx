import type { IconifyName } from 'src/components/iconify/register-icons';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type LinkItem = {
  icon: IconifyName;
  title: string;
  description: string;
  href: string;
  accentChannel: 'primary' | 'warning' | 'info';
};

const LINKS: LinkItem[] = [
  {
    icon: 'solar:wallet-bold',
    title: '资金动态',
    description: '北向 · 主力 · 沪深港通资金全貌',
    href: '/market/money-flow',
    accentChannel: 'warning',
  },
  {
    icon: 'solar:shuffle-bold',
    title: '行业分析',
    description: '轮动趋势 · 资金流向 · 估值分位',
    href: '/market/industry',
    accentChannel: 'primary',
  },
  {
    icon: 'solar:fire-bold',
    title: '热力图全景',
    description: '板块强弱分布 · 概念行业热度',
    href: '/market/industry?tab=0',
    accentChannel: 'info',
  },
];

// ----------------------------------------------------------------------

export function MarketQuickLinks() {
  const theme = useTheme();

  return (
    <Grid container spacing={2}>
      {LINKS.map((item) => {
        const ch = item.accentChannel;
        const channelVar =
          ch === 'primary'
            ? theme.vars.palette.primary.mainChannel
            : ch === 'warning'
              ? theme.vars.palette.warning.mainChannel
              : theme.vars.palette.info.mainChannel;

        const accentColor =
          ch === 'primary'
            ? theme.palette.primary.main
            : ch === 'warning'
              ? theme.palette.warning.main
              : theme.palette.info.main;

        return (
          <Grid key={item.href} size={{ xs: 12, sm: 4 }}>
            <Box
              component={RouterLink}
              href={item.href}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
                borderRadius: 2,
                textDecoration: 'none',
                border: `1px solid ${varAlpha(channelVar, 0.12)}`,
                bgcolor: varAlpha(channelVar, 0.04),
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: varAlpha(channelVar, 0.1),
                  borderColor: varAlpha(channelVar, 0.3),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 16px ${varAlpha(channelVar, 0.2)}`,
                },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: varAlpha(channelVar, 0.12),
                  flexShrink: 0,
                }}
              >
                <Iconify icon={item.icon} width={22} sx={{ color: accentColor }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25 }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}
                >
                  {item.description}
                </Typography>
              </Box>

              <Stack alignItems="center" justifyContent="center" sx={{ flexShrink: 0 }}>
                <Iconify icon="solar:arrow-right-bold" width={16} sx={{ color: accentColor }} />
              </Stack>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
