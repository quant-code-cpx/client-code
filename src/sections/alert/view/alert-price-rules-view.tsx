import type { PriceAlertRule } from 'src/api/alert';

import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { alertApi } from 'src/api/alert';
import { getSocket } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/context';

import { AlertScanButton } from '../alert-scan-button';
import { AlertPriceRuleStats } from '../alert-price-rule-stats';
import { AlertPriceRuleTable } from '../alert-price-rule-table';
import { AlertPriceRuleDialog } from '../alert-price-rule-dialog';

// ----------------------------------------------------------------------

export function AlertPriceRulesView() {
  const { role } = useAuth();
  const [rules, setRules] = useState<PriceAlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceAlertRule | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await alertApi.getPriceRules();
      setRules(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载预警规则失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return undefined;
    const socket = getSocket();
    const handler = () => fetchRules();
    socket.on('price-alert', handler);
    return () => {
      socket.off('price-alert', handler);
    };
  }, [role, fetchRules]);

  const handleDelete = async (id: number) => {
    try {
      await alertApi.deletePriceRule(id);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleToggleStatus = async (rule: PriceAlertRule) => {
    const newStatus = rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await alertApi.updatePriceRule(rule.id, { status: newStatus });
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新状态失败');
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">价格预警规则</Typography>
        <Stack direction="row" spacing={1}>
          <AlertScanButton type="price" onScanned={fetchRules} />
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => {
              setEditingRule(null);
              setDialogOpen(true);
            }}
          >
            新建规则
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <AlertPriceRuleStats rules={rules} loading={loading} />

      <Card sx={{ mt: 3 }}>
        <AlertPriceRuleTable
          rules={rules}
          loading={loading}
          onEdit={(rule) => {
            setEditingRule(rule);
            setDialogOpen(true);
          }}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      </Card>

      <AlertPriceRuleDialog
        open={dialogOpen}
        rule={editingRule}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          fetchRules();
        }}
      />
    </DashboardContent>
  );
}
