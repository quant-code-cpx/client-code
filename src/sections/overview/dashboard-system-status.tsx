import type { TushareSyncPlan } from 'src/api/tushare-sync';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import Accordion from '@mui/material/Accordion';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const CATEGORY_LABEL: Record<string, string> = {
  basic: '基础数据',
  market: '市场行情',
  financial: '财务数据',
  moneyflow: '资金流数据',
};

// ----------------------------------------------------------------------

export function DashboardSystemStatus() {
  const [plans, setPlans] = useState<TushareSyncPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    tushareSyncApi
      .getPlans()
      .then((res) => {
        if (!cancelled) setPlans(res ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载同步计划失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <Accordion defaultExpanded={false}>
        <AccordionSummary
          expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
          sx={{ px: 2.5 }}
        >
          <Typography variant="h6">数据同步状态</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <CardContent sx={{ pt: 0 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} variant="text" height={36} />
                ))}
              </>
            ) : plans.length === 0 ? (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  暂无同步计划
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>任务名称</TableCell>
                      <TableCell>分类</TableCell>
                      <TableCell>调度</TableCell>
                      <TableCell align="center">状态</TableCell>
                      <TableCell>说明</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.task} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="fontWeightMedium">
                            {plan.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {plan.task}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {CATEGORY_LABEL[plan.category] ?? plan.category}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {plan.schedule?.cron ?? '—'}
                          </Typography>
                          {plan.schedule?.description != null && (
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', color: 'text.secondary' }}
                            >
                              {plan.schedule.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: plan.bootstrapEnabled ? 'success.main' : 'text.disabled',
                              display: 'inline-block',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {[
                              plan.supportsManual ? '支持手动' : null,
                              plan.supportsFullSync ? '全量' : null,
                            ]
                              .filter(Boolean)
                              .join(' / ')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </AccordionDetails>
      </Accordion>
    </Card>
  );
}
