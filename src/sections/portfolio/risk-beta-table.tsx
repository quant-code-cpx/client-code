import type { BetaAnalysis } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { getRiskBeta } from 'src/api/portfolio';

// ----------------------------------------------------------------------

interface RiskBetaTableProps {
  portfolioId: string;
}

function getBetaColor(beta: number | null): string | undefined {
  if (beta === null) return undefined;
  if (beta > 1.2) return 'error.main';
  if (beta < 0.8) return 'info.main';
  return undefined;
}

export function RiskBetaTable({ portfolioId }: RiskBetaTableProps) {
  const [data, setData] = useState<BetaAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRiskBeta({ portfolioId });
      setData(res);
    } catch {
      setError('加载 Beta 分析失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Beta 分析
        </Typography>

        {loading && <Skeleton variant="rectangular" height={280} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && data && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                组合 Beta：
                <Typography
                  component="span"
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: getBetaColor(data.portfolioBeta) }}
                >
                  {data.portfolioBeta === null ? '-' : data.portfolioBeta.toFixed(4)}
                </Typography>
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>股票代码</TableCell>
                  <TableCell>股票名称</TableCell>
                  <TableCell align="right">Beta</TableCell>
                  <TableCell align="right">权重</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.holdings.map((h) => (
                  <TableRow key={h.tsCode}>
                    <TableCell>{h.tsCode}</TableCell>
                    <TableCell>{h.stockName}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ color: getBetaColor(h.beta) }}
                      >
                        {h.beta === null ? '-' : h.beta.toFixed(4)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {h.weight === null ? '-' : `${(h.weight * 100).toFixed(2)}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {!loading && !error && !data && (
          <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              暂无数据
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
