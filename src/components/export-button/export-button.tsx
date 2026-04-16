import type { ExportFormat, ExportRequest } from 'src/api/export';

import { useState } from 'react';

import Menu from '@mui/material/Menu';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';

import { exportData } from 'src/api/export';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  source: ExportRequest['source'];
  params?: ExportRequest['params'];
  columns?: ExportRequest['columns'];
  formats?: ExportFormat[];
};

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel',
};

export function ExportButton({ source, params, columns, formats = ['csv', 'xlsx'] }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async (format: ExportFormat) => {
    setAnchorEl(null);
    setLoading(true);
    setError('');
    try {
      await exportData({ format, source, params, columns });
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title={error || '导出当前筛选条件下的全部数据'}>
        <Button
          variant="outlined"
          size="small"
          startIcon={
            loading ? (
              <CircularProgress size={16} />
            ) : (
              <Iconify icon="solar:download-bold" width={18} />
            )
          }
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={loading}
          color={error ? 'error' : 'inherit'}
        >
          导出
        </Button>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {formats.map((f) => (
          <MenuItem key={f} onClick={() => handleExport(f)}>
            {FORMAT_LABELS[f]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
