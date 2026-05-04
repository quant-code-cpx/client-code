import type { FactorDef } from 'src/api/factor';

import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { SOURCE_LABELS, CATEGORY_LABELS } from '../constants';

// ----------------------------------------------------------------------

type Props = {
  factor: FactorDef | null;
  onClose: () => void;
  onAddToScreening: (factor: FactorDef) => void;
};

const fmtNum = (v: number | null | undefined, digits = 2): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);

const fmtPercent = (v: number | null | undefined): string =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(0)}%`;

const fmtDate = (v: string | null | undefined): string => {
  if (!v) return '—';
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  return v;
};

export function FactorLibraryDetailDrawer({ factor, onClose, onAddToScreening }: Props) {
  const navigate = useNavigate();

  return (
    <Drawer anchor="right" open={!!factor} onClose={onClose} PaperProps={{ sx: { width: 480 } }}>
      {factor && (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontFamily: 'monospace', fontSize: 12 }}
              >
                {factor.name}
              </Typography>
              <Typography variant="h6" sx={{ fontSize: 18 }}>
                {factor.label}
              </Typography>
            </Box>
            <IconButton onClick={onClose}>
              <Iconify icon="solar:close-circle-bold" width={20} />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Chip
              size="small"
              label={CATEGORY_LABELS[factor.category]}
              color="primary"
              variant="outlined"
            />
            <Chip
              size="small"
              label={SOURCE_LABELS[factor.sourceType]}
              color="default"
              variant="outlined"
            />
            {factor.usageCount !== undefined && factor.usageCount > 0 && (
              <Chip size="small" label={`被引用 ${factor.usageCount} 次`} variant="outlined" />
            )}
          </Stack>

          {factor.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 13 }}>
              {factor.description}
            </Typography>
          )}

          {factor.formula && (
            <Box
              sx={{
                p: 1.5,
                mb: 2,
                bgcolor: 'background.neutral',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {factor.formula}
            </Box>
          )}

          {factor.docUrl && (
            <Link
              href={factor.docUrl}
              target="_blank"
              rel="noopener"
              sx={{ mb: 2, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              <Iconify icon="solar:share-bold" width={14} />
              查看文档
            </Link>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 13 }}>
            质量摘要
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 1.5,
              mb: 2,
              fontFeatureSettings: '"tnum"',
            }}
          >
            <MetricRow label="IC 5d" value={fmtNum(factor.summary?.ic5d, 3)} />
            <MetricRow label="IC 10d" value={fmtNum(factor.summary?.ic10d, 3)} />
            <MetricRow label="IC 20d" value={fmtNum(factor.summary?.ic20d, 3)} />
            <MetricRow label="IR" value={fmtNum(factor.summary?.ir, 2)} />
            <MetricRow label="覆盖度" value={fmtPercent(factor.summary?.coverage)} />
            <MetricRow label="最近预计算" value={fmtDate(factor.summary?.lastComputeDate)} />
          </Box>

          {factor.topRelated && factor.topRelated.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 13 }}>
                Top 相关因子
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                {factor.topRelated.map((rel) => (
                  <Chip
                    key={rel.name}
                    size="small"
                    label={`${rel.label} (${rel.corr.toFixed(2)})`}
                    onClick={() => {
                      onClose();
                      navigate(`/factor/correlation?names=${rel.name},${factor.name}`);
                    }}
                  />
                ))}
              </Stack>
            </>
          )}

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                onClose();
                navigate(`/factor/detail/${factor.name}`);
              }}
            >
              进入详情
            </Button>
            <Button variant="outlined" fullWidth onClick={() => onAddToScreening(factor)}>
              加入选股
            </Button>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}

// ----------------------------------------------------------------------

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}
