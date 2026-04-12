import type {
  StrategyVersionItem,
  CompareVersionsResponse,
} from 'src/api/strategy';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { fDateTime } from 'src/utils/format-time';

import { listStrategyVersions, compareStrategyVersions } from 'src/api/strategy';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type ConfigDiffChangeType = 'ADDED' | 'REMOVED' | 'CHANGED';

const DIFF_LABEL_MAP: Record<ConfigDiffChangeType, { color: 'success' | 'error' | 'warning'; text: string }> = {
  ADDED: { color: 'success', text: '新增' },
  REMOVED: { color: 'error', text: '删除' },
  CHANGED: { color: 'warning', text: '修改' },
};

// ----------------------------------------------------------------------

type VersionRowProps = {
  version: StrategyVersionItem;
  onCompare: (versionA: number, versionB: number) => void;
};

function VersionRow({ version, onCompare }: VersionRowProps) {
  return (
    <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          mt: 0.8,
          flexShrink: 0,
          bgcolor: version.isCurrent ? 'primary.main' : 'text.disabled',
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">v{version.version}</Typography>
          {version.isCurrent && (
            <Label color="primary" variant="soft">
              当前
            </Label>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {fDateTime(version.createdAt)}
        </Typography>
        {version.changelog && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {version.changelog}
          </Typography>
        )}
      </Box>
      {version.version > 1 && (
        <Button
          size="small"
          variant="text"
          sx={{ flexShrink: 0 }}
          onClick={() => onCompare(version.version - 1, version.version)}
        >
          对比
        </Button>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

type DiffDialogProps = {
  open: boolean;
  onClose: () => void;
  strategyId: string;
  versionA: number;
  versionB: number;
};

function VersionDiffDialog({ open, onClose, strategyId, versionA, versionB }: DiffDialogProps) {
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

// ----------------------------------------------------------------------

type StrategyVersionCardProps = {
  strategyId: string;
};

export function StrategyVersionCard({ strategyId }: StrategyVersionCardProps) {
  const [versions, setVersions] = useState<StrategyVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [diffOpen, setDiffOpen] = useState(false);
  const [diffVersionA, setDiffVersionA] = useState<number>(1);
  const [diffVersionB, setDiffVersionB] = useState<number>(1);

  const [selectA, setSelectA] = useState<number | ''>('');
  const [selectB, setSelectB] = useState<number | ''>('');

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listStrategyVersions(strategyId);
      setVersions(data);
      // 初始化选择器默认值
      if (data.length >= 2) {
        setSelectA(data[data.length - 2].version);
        setSelectB(data[data.length - 1].version);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '获取版本列表失败');
    } finally {
      setLoading(false);
    }
  }, [strategyId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleQuickCompare = (vA: number, vB: number) => {
    setDiffVersionA(vA);
    setDiffVersionB(vB);
    setDiffOpen(true);
  };

  const handleOpenDiff = () => {
    if (selectA === '' || selectB === '' || selectA === selectB) return;
    setDiffVersionA(selectA);
    setDiffVersionB(selectB);
    setDiffOpen(true);
  };

  const canCompare = selectA !== '' && selectB !== '' && selectA !== selectB;

  return (
    <>
      <Card>
        <CardHeader
          title="版本历史"
          titleTypographyProps={{ variant: 'subtitle1' }}
          action={
            <IconButton size="small" onClick={fetchVersions}>
              <Iconify icon="solar:refresh-bold" />
            </IconButton>
          }
        />
        <Divider />

        {loading && (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={56} sx={{ mb: 0.5 }} />
            ))}
          </Box>
        )}

        {!loading && error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ mb: 0 }}>
              {error}
            </Alert>
          </Box>
        )}

        {!loading && !error && versions.length > 0 && (
          <Scrollbar sx={{ maxHeight: 380 }}>
            <Stack divider={<Divider />}>
              {[...versions].reverse().map((v) => (
                <VersionRow key={v.version} version={v} onCompare={handleQuickCompare} />
              ))}
            </Stack>
          </Scrollbar>
        )}

        {!loading && !error && versions.length === 0 && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              暂无版本记录
            </Typography>
          </Box>
        )}

        {versions.length >= 2 && (
          <>
            <Divider />
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                版本对比：
              </Typography>
              <Select
                size="small"
                value={selectA}
                onChange={(e) => setSelectA(e.target.value as number)}
                sx={{ minWidth: 80 }}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  版本 A
                </MenuItem>
                {versions.map((v) => (
                  <MenuItem key={v.version} value={v.version}>
                    v{v.version}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2" color="text.secondary">
                ⟷
              </Typography>
              <Select
                size="small"
                value={selectB}
                onChange={(e) => setSelectB(e.target.value as number)}
                sx={{ minWidth: 80 }}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  版本 B
                </MenuItem>
                {versions.map((v) => (
                  <MenuItem key={v.version} value={v.version}>
                    v{v.version}
                  </MenuItem>
                ))}
              </Select>
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenDiff}
                disabled={!canCompare}
              >
                对比
              </Button>
            </Box>
          </>
        )}
      </Card>

      <VersionDiffDialog
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        strategyId={strategyId}
        versionA={diffVersionA}
        versionB={diffVersionB}
      />
    </>
  );
}
