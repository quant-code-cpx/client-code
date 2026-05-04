import type { ReportListItem } from 'src/api/report';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { listReports } from 'src/api/report';

import { ReportTypeChip, ReportStatusChip } from '../report/components/report-chips';

type Props = { refreshKey?: number };

function ReportRow({ item, onClick }: { item: ReportListItem; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        px: 1.5,
        py: 1.25,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          variant="body2"
          fontWeight="fontWeightMedium"
          noWrap
          sx={{ flex: 1, minWidth: 0 }}
        >
          {item.title}
        </Typography>
        <ReportStatusChip status={item.status} />
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
        <ReportTypeChip type={item.type} />
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {item.format}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          · {fToNow(item.createdAt)}前
        </Typography>
      </Stack>
    </Box>
  );
}

export function DashboardRecentReports({ refreshKey }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    listReports({ page: 1, pageSize: 5 })
      .then((res) => {
        if (!cancelled) setItems(res?.items ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载报告失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">我的最新报告</Typography>
          <Button
            component={RouterLink}
            href={paths.research.report.list}
            size="small"
            variant="text"
            sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
          >
            查看全部
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rectangular" height={64} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </>
        ) : items.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无报告
            </Typography>
            <Button
              component={RouterLink}
              href={paths.research.report.list}
              size="small"
              variant="contained"
            >
              前往生成
            </Button>
          </Box>
        ) : (
          items.map((it, idx) => (
            <Box key={it.id}>
              {idx > 0 && <Divider sx={{ my: 0.5 }} />}
              <ReportRow
                item={it}
                onClick={() => router.push(paths.research.report.detail(it.id))}
              />
            </Box>
          ))
        )}
      </CardContent>

      {!loading && items.length > 0 && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Button
            component={RouterLink}
            href={paths.research.report.list}
            size="small"
            fullWidth
            variant="outlined"
          >
            生成新报告
          </Button>
        </Box>
      )}
    </Card>
  );
}
