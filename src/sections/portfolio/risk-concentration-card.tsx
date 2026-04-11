import type { PositionConcentration } from 'src/api/portfolio';

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

import { getRiskPosition } from 'src/api/portfolio';

import { Label } from 'src/components/label';

import { getHhiLevel } from './constants';

// ----------------------------------------------------------------------

interface RiskConcentrationCardProps {
  portfolioId: string;
}

export function RiskConcentrationCard({ portfolioId }: RiskConcentrationCardProps) {
  const [data, setData] = useState<PositionConcentration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRiskPosition({ portfolioId });
      setData(res);
    } catch {
      setError('加载仓位集中度失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const conc = data?.concentration;
  const hhiLevel = conc ? getHhiLevel(conc.hhi) : null;

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          仓位集中度
        </Typography>

        {loading && <Skeleton variant="rectangular" height={280} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && conc && hhiLevel && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                HHI: <strong>{conc.hhi.toFixed(4)}</strong>
              </Typography>
              <Label color={hhiLevel.color}>{hhiLevel.label}</Label>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2">
                Top1：{(conc.top1Weight * 100).toFixed(2)}%
              </Typography>
              <Typography variant="body2">
                Top3：{(conc.top3Weight * 100).toFixed(2)}%
              </Typography>
              <Typography variant="body2">
                Top5：{(conc.top5Weight * 100).toFixed(2)}%
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>排名</TableCell>
                  <TableCell>股票代码</TableCell>
                  <TableCell>股票名称</TableCell>
                  <TableCell align="right">权重</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.positions.map((pos, idx) => (
                  <TableRow key={pos.tsCode}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{pos.tsCode}</TableCell>
                    <TableCell>{pos.stockName}</TableCell>
                    <TableCell align="right">
                      {pos.weight === null ? '-' : `${(pos.weight * 100).toFixed(2)}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {!loading && !error && !conc && (
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
