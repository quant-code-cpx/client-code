import type { ViolationRecord } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime } from 'src/utils/format-time';

import { getViolations } from 'src/api/portfolio';

import { Label } from 'src/components/label';

import { RULE_TYPE_LABEL, RULE_TYPE_COLOR } from './constants';

// ----------------------------------------------------------------------

interface ViolationHistoryTableProps {
  portfolioId: string;
}

export function ViolationHistoryTable({ portfolioId }: ViolationHistoryTableProps) {
  const [records, setRecords] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getViolations({ portfolioId, limit: 50 });
      setRecords(res);
    } catch {
      setError('加载违规记录失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <Skeleton variant="rectangular" height={200} />;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>检测时间</TableCell>
            <TableCell>规则类型</TableCell>
            <TableCell>股票</TableCell>
            <TableCell align="right">实际值</TableCell>
            <TableCell align="right">阈值</TableCell>
            <TableCell>描述</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((rec) => (
            <TableRow key={rec.id} hover>
              <TableCell>{fDateTime(rec.detectedAt)}</TableCell>
              <TableCell>
                <Label color={RULE_TYPE_COLOR[rec.ruleType] ?? 'default'}>
                  {RULE_TYPE_LABEL[rec.ruleType] ?? rec.ruleType}
                </Label>
              </TableCell>
              <TableCell>{rec.tsCode ?? '-'}</TableCell>
              <TableCell align="right">{(rec.currentValue * 100).toFixed(2)}%</TableCell>
              <TableCell align="right">{(rec.threshold * 100).toFixed(2)}%</TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ maxWidth: 300 }}>
                  {rec.message}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  暂无违规记录
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
