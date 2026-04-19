import type { PnlToday, PortfolioListItem } from 'src/api/portfolio';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { useRouter } from 'src/routes/hooks';

import { fPercent, fCurrency } from 'src/utils/format-number';

import { getPnlToday, listPortfolios } from 'src/api/portfolio';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type PortfolioSnapshot = PortfolioListItem & {
  pnl: PnlToday | null;
};

export function DashboardPortfolioGlance() {
  const theme = useTheme();
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPortfolios()
      .then(async (list) => {
        if (!list || list.length === 0) {
          setPortfolios([]);
          return;
        }
        // Fetch PnL for top 3 portfolios
        const top = list.slice(0, 3);
        const snaps = await Promise.all(
          top.map(async (p) => {
            try {
              const pnl = await getPnlToday({ portfolioId: p.id });
              return { ...p, pnl };
            } catch {
              return { ...p, pnl: null };
            }
          })
        );
        setPortfolios(snaps);
      })
      .catch(() => setPortfolios([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton variant="rounded" height={200} />;
  }

  const totalPnl = portfolios.reduce((sum, p) => sum + (p.pnl?.todayPnl ?? 0), 0);
  const totalPnlPct =
    portfolios.length > 0
      ? portfolios.reduce((sum, p) => sum + (p.pnl?.todayPnlPct ?? 0), 0) / portfolios.length
      : 0;
  const isUp = totalPnl >= 0;

  return (
    <Card
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: theme.customShadows.z8 },
      }}
      onClick={() => router.push('/portfolio')}
    >
      <CardHeader
        title="我的组合"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        avatar={<Iconify icon="solar:wallet-bold" width={22} sx={{ color: 'warning.main' }} />}
        subheader={`${portfolios.length} 个组合`}
        subheaderTypographyProps={{ variant: 'caption' }}
        sx={{ pb: 1 }}
      />

      <Box sx={{ px: 3, pb: 2.5 }}>
        {portfolios.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center', color: 'text.disabled' }}>
            <Iconify icon="solar:add-circle-bold" width={28} sx={{ mb: 0.5, opacity: 0.4 }} />
            <Typography variant="caption" display="block">
              暂无组合，点击创建
            </Typography>
          </Box>
        ) : (
          <>
            {/* Total daily PnL */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: varAlpha(
                  isUp
                    ? theme.vars.palette.error.mainChannel
                    : theme.vars.palette.success.mainChannel,
                  0.06
                ),
                mb: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                今日盈亏
              </Typography>
              <Stack direction="row" alignItems="baseline" spacing={0.75}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, color: isUp ? 'error.main' : 'success.main' }}
                >
                  {isUp ? '+' : ''}
                  {fCurrency(totalPnl)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: isUp ? 'error.main' : 'success.main', fontWeight: 600 }}
                >
                  {isUp ? '+' : ''}
                  {fPercent(totalPnlPct)}
                </Typography>
              </Stack>
            </Box>

            {/* Individual portfolios */}
            <Stack spacing={0.75}>
              {portfolios.map((p) => {
                const pnl = p.pnl?.todayPnl ?? 0;
                const pnlPct = p.pnl?.todayPnlPct ?? 0;
                const pos = pnl >= 0;
                return (
                  <Stack
                    key={p.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.04),
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: 13,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: pos ? 'error.main' : 'success.main',
                      }}
                    >
                      {pos ? '+' : ''}
                      {fPercent(pnlPct)}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </>
        )}
      </Box>
    </Card>
  );
}
