import type { DriftDetectionResponse } from 'src/api/portfolio';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { detectDrift } from 'src/api/portfolio';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

const DRIFT_TYPE_LABEL: Record<string, string> = {
  MISSING_IN_PORTFOLIO: '组合中缺少',
  EXTRA_IN_PORTFOLIO: '组合中多余',
  WEIGHT_DRIFT: '权重偏离',
  ALIGNED: '已对齐',
};

const DRIFT_TYPE_COLOR: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
  MISSING_IN_PORTFOLIO: 'error',
  EXTRA_IN_PORTFOLIO: 'warning',
  WEIGHT_DRIFT: 'info',
  ALIGNED: 'success',
};

function fPct(v: number | null) {
  if (v == null) return '--';
  return `${(v * 100).toFixed(2)}%`;
}

// ----------------------------------------------------------------------

interface PortfolioDriftTabProps {
  portfolioId: string;
}

export function PortfolioDriftTab({ portfolioId }: PortfolioDriftTabProps) {
  const [strategyId, setStrategyId] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('0.05');
  const [data, setData] = useState<DriftDetectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDetect = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await detectDrift({
        portfolioId,
        strategyId: strategyId || undefined,
        alertThreshold: alertThreshold ? Number(alertThreshold) : undefined,
      });
      setData(res);
    } catch {
      setError('漂移检测失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, strategyId, alertThreshold]);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            漂移检测参数
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="策略 ID（选填）"
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              size="small"
              placeholder="输入绑定的策略 ID"
            />
            <TextField
              label="告警阈值"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              size="small"
              placeholder="0.05"
              sx={{ width: 120 }}
            />
            <Button variant="contained" onClick={handleDetect} disabled={loading}>
              执行检测
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && data && (
        <>
          <Alert severity={data.isAlerting ? 'error' : 'success'} sx={{ mb: 3 }}>
            {data.isAlerting
              ? `漂移告警：综合漂移度 ${fPct(data.overallDrift)} 超过阈值 ${fPct(data.alertThreshold)}`
              : `漂移正常：综合漂移度 ${fPct(data.overallDrift)}，未超过阈值 ${fPct(data.alertThreshold)}`}
          </Alert>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                逐只股票漂移明细
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>股票代码</TableCell>
                      <TableCell>股票名称</TableCell>
                      <TableCell align="right">实际权重</TableCell>
                      <TableCell align="right">目标权重</TableCell>
                      <TableCell align="right">偏差</TableCell>
                      <TableCell>漂移类型</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            暂无漂移明细
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.items.map((item) => (
                        <TableRow key={item.tsCode} hover>
                          <TableCell>{item.tsCode}</TableCell>
                          <TableCell>{item.stockName}</TableCell>
                          <TableCell align="right">{fPct(item.actualWeight)}</TableCell>
                          <TableCell align="right">{fPct(item.targetWeight)}</TableCell>
                          <TableCell align="right">{fPct(item.weightDiff)}</TableCell>
                          <TableCell>
                            <Label
                              color={DRIFT_TYPE_COLOR[item.driftType] ?? 'default'}
                              variant="soft"
                            >
                              {DRIFT_TYPE_LABEL[item.driftType] ?? item.driftType}
                            </Label>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {data.industryDrift.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  行业漂移明细
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>行业</TableCell>
                        <TableCell align="right">实际权重</TableCell>
                        <TableCell align="right">目标权重</TableCell>
                        <TableCell align="right">差值</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.industryDrift.map((item) => (
                        <TableRow key={item.industry} hover>
                          <TableCell>{item.industry}</TableCell>
                          <TableCell align="right">{fPct(item.actualWeight)}</TableCell>
                          <TableCell align="right">{fPct(item.targetWeight)}</TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: item.diff > 0 ? 'error.main' : 'success.main' }}
                          >
                            {item.diff > 0 ? '+' : ''}
                            {fPct(item.diff)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}
