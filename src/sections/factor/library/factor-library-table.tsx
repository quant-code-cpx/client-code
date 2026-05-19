import type { FactorDef, FactorStatus } from 'src/api/factor';

import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { deriveStatus, getStatusMeta, SOURCE_LABELS, CATEGORY_LABELS } from '../constants';

// ----------------------------------------------------------------------

type Props = {
  factors: FactorDef[];
  selectedNames: Set<string>;
  onToggleSelect: (factor: FactorDef) => void;
  onToggleSelectAll: (factors: FactorDef[], next: boolean) => void;
  onOpenDetail: (factor: FactorDef) => void;
  onEdit: (factor: FactorDef) => void;
  onDelete: (factor: FactorDef) => void;
  onPrecompute: (factor: FactorDef) => void;
  precomputingNames: Set<string>;
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

export function FactorLibraryTable({
  factors,
  selectedNames,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetail,
  onEdit,
  onDelete,
  onPrecompute,
  precomputingNames,
}: Props) {
  const theme = useTheme();
  const navigate = useNavigate();

  const allSelected = factors.length > 0 && factors.every((f) => selectedNames.has(f.name));
  const someSelected = factors.some((f) => selectedNames.has(f.name)) && !allSelected;

  return (
    <Scrollbar sx={{ maxHeight: 'calc(100vh - 320px)' }}>
      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(_, checked) => onToggleSelectAll(factors, checked)}
                />
              </TableCell>
              <TableCell sx={{ minWidth: 140 }}>名称</TableCell>
              <TableCell sx={{ minWidth: 160 }}>标签</TableCell>
              <TableCell sx={{ minWidth: 80 }}>分类</TableCell>
              <TableCell sx={{ minWidth: 80 }}>来源</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>
                IC 10d
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 70 }}>
                IR
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>
                覆盖度
              </TableCell>
              <TableCell sx={{ minWidth: 110 }}>最近预计算</TableCell>
              <TableCell align="center" sx={{ minWidth: 80 }}>
                状态
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 140 }}>
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {factors.map((factor) => {
              const status: FactorStatus =
                factor.status ??
                deriveStatus({
                  isEnabled: factor.isEnabled,
                  lastComputeDate: factor.summary?.lastComputeDate,
                  latencyDays: factor.summary?.latencyDays,
                });
              const statusMeta = getStatusMeta(status);
              const dotColor =
                statusMeta.color === 'default'
                  ? theme.palette.text.disabled
                  : theme.palette[statusMeta.color].main;
              const isCustom = !factor.isBuiltin;
              const selected = selectedNames.has(factor.name);
              const precomputing = precomputingNames.has(factor.name);

              return (
                <TableRow
                  key={factor.id}
                  hover
                  selected={selected}
                  sx={{ cursor: 'pointer', height: 40 }}
                  onClick={() => navigate(`/factor/detail/${factor.name}`)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size="small"
                      checked={selected}
                      onChange={() => onToggleSelect(factor)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {factor.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {factor.label}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={CATEGORY_LABELS[factor.category]}
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 12 }}>
                      {SOURCE_LABELS[factor.sourceType]}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"', fontSize: 12 }}>
                    {fmtNum(factor.summary?.ic10d, 3)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"', fontSize: 12 }}>
                    {fmtNum(factor.summary?.ir, 2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFeatureSettings: '"tnum"', fontSize: 12 }}>
                    {fmtPercent(factor.summary?.coverage)}
                  </TableCell>
                  <TableCell sx={{ fontFeatureSettings: '"tnum"', fontSize: 12 }}>
                    {fmtDate(factor.summary?.lastComputeDate)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={statusMeta.label}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          mx: 'auto',
                          bgcolor: dotColor,
                        }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'inline-flex', gap: 0.25, alignItems: 'center' }}>
                      {precomputing && <CircularProgress size={14} />}
                      <Tooltip title="详情">
                        <IconButton size="small" onClick={() => onOpenDetail(factor)}>
                          <Iconify icon="solar:info-circle-bold" width={16} />
                        </IconButton>
                      </Tooltip>
                      {isCustom && (
                        <>
                          <Tooltip title="预计算">
                            <IconButton
                              size="small"
                              disabled={precomputing}
                              onClick={() => onPrecompute(factor)}
                            >
                              <Iconify icon="solar:refresh-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="编辑">
                            <IconButton size="small" onClick={() => onEdit(factor)}>
                              <Iconify icon="solar:pen-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton size="small" color="error" onClick={() => onDelete(factor)}>
                              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {factors.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    当前筛选下无匹配因子
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );
}
