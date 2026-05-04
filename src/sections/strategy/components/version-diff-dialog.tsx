import type { CompareVersionsResponse } from 'src/api/strategy';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { fDateTime } from 'src/utils/format-time';

import { compareStrategyVersions } from 'src/api/strategy';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type ConfigDiffChangeType = 'ADDED' | 'REMOVED' | 'CHANGED';

const DIFF_LABEL_MAP: Record<ConfigDiffChangeType, { color: 'success' | 'error' | 'warning'; text: string }> = {
  ADDED: { color: 'success', text: '新增' },
  REMOVED: { color: 'error', text: '删除' },
  CHANGED: { color: 'warning', text: '修改' },
};

// ----------------------------------------------------------------------

export type VersionDiffDialogProps = {
  open: boolean;
  onClose: () => void;
  strategyId: string;
  versionA: number;
  versionB: number;
};

export function VersionDiffDialog({ open, onClose, strategyId, versionA, versionB }: VersionDiffDialogProps) {
  const [diffData, setDiffData] = useState<CompareVersionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    setDiffData(null);
    compareStrategyVersions({ strategyId, versionA, versionB })
      .then(setDiffData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '获取对比数据失败'))
      .finally(() => setLoading(false));
  }, [open, strategyId, versionA, versionB]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        版本对比 v{versionA} → v{versionB}
      </DialogTitle>
      <DialogContent>
        {loading && <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && diffData && (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Box sx={{ flex: 1, p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
                <Typography variant="subtitle2">版本 {diffData.versionA.version}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fDateTime(diffData.versionA.createdAt)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
                <Typography variant="subtitle2">版本 {diffData.versionB.version}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fDateTime(diffData.versionB.createdAt)}
                </Typography>
              </Box>
            </Box>

            {diffData.configDiff.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">两个版本配置完全一致</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>配置路径</TableCell>
                    <TableCell>旧值 (v{versionA})</TableCell>
                    <TableCell>新值 (v{versionB})</TableCell>
                    <TableCell align="center">变更类型</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {diffData.configDiff.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {item.path}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'error.main' }}>
                          {item.oldValue !== undefined ? JSON.stringify(item.oldValue) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'success.main' }}>
                          {item.newValue !== undefined ? JSON.stringify(item.newValue) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Label color={DIFF_LABEL_MAP[item.changeType as ConfigDiffChangeType].color}>
                          {DIFF_LABEL_MAP[item.changeType as ConfigDiffChangeType].text}
                        </Label>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
