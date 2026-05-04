import type {
  StrategyVersionItem,
} from 'src/api/strategy';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { fDateTime } from 'src/utils/format-time';

import { listStrategyVersions, compareStrategyVersions } from 'src/api/strategy';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { VersionDiffDialog } from './components/version-diff-dialog';

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

  // 自动加载"当前 vs 上一版本"的 diff 变更数
  const [autoInlineDiffCount, setAutoInlineDiffCount] = useState<number | null>(null);
  const [autoVersionA, setAutoVersionA] = useState<number>(1);
  const [autoVersionB, setAutoVersionB] = useState<number>(2);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listStrategyVersions(strategyId);
      setVersions(data);
      if (data.length >= 2) {
        const vA = data[data.length - 2].version;
        const vB = data[data.length - 1].version;
        setSelectA(vA);
        setSelectB(vB);
        setAutoVersionA(vA);
        setAutoVersionB(vB);
        // 静默加载 diff 数量
        compareStrategyVersions({ strategyId, versionA: vA, versionB: vB })
          .then((res) => setAutoInlineDiffCount(res.configDiff.length))
          .catch(() => {});
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

        {/* 当前 vs 上一版本 inline 摘要 */}
        {!loading && autoInlineDiffCount !== null && versions.length >= 2 && (
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'background.neutral',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              v{autoVersionA} → v{autoVersionB}：
            </Typography>
            {autoInlineDiffCount === 0 ? (
              <Typography variant="caption" color="text.secondary">
                配置无变更
              </Typography>
            ) : (
              <Typography variant="caption" color="warning.main">
                {autoInlineDiffCount} 项配置变更
              </Typography>
            )}
            <Button
              size="small"
              variant="text"
              sx={{ ml: 'auto', minWidth: 0, px: 1, py: 0, fontSize: 12 }}
              onClick={() => {
                setDiffVersionA(autoVersionA);
                setDiffVersionB(autoVersionB);
                setDiffOpen(true);
              }}
            >
              查看详情
            </Button>
          </Box>
        )}

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
