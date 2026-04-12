import type { AlertColor } from '@mui/material/Alert';

import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';

import { alertApi } from 'src/api/alert';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/context';

// ----------------------------------------------------------------------

type Props = {
  type: 'price' | 'anomaly';
  onScanned?: () => void;
};

export function AlertScanButton({ type, onScanned }: Props) {
  const { role } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'success' });

  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  if (!isAdmin) return null;

  const handleScan = async () => {
    setScanning(true);
    try {
      if (type === 'price') {
        const result = await alertApi.scanPriceRules();
        setSnackbar({
          open: true,
          message: `价格预警扫描完成，触发 ${result.triggered} 条规则`,
          severity: 'success',
        });
      } else {
        const result = await alertApi.scanAnomalies();
        setSnackbar({
          open: true,
          message: `异动扫描完成，发现 ${result.totalNew} 条异动`,
          severity: 'success',
        });
      }
      onScanned?.();
    } catch {
      setSnackbar({ open: true, message: '扫描失败，请稍后重试', severity: 'error' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="warning"
        loading={scanning}
        startIcon={<Iconify icon="solar:refresh-bold" width={18} />}
        onClick={handleScan}
      >
        立即扫描
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
