import type { ModelConnection, ModelDeployment, ModelProbeResult } from 'src/api/model-provider';

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { HasPermission } from 'src/permission';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  testModelConnection,
  probeModelDeployment,
  deleteModelConnection,
  deleteModelDeployment,
  updateModelConnection,
  updateModelDeployment,
  getModelConnectionDeleteImpact,
  getModelDeploymentDeleteImpact,
} from 'src/api/model-provider';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { ConnectionList } from '../connections/connection-list';
import { DeploymentTable } from '../deployments/deployment-table';
import { ProviderStatusStrip } from '../components/provider-status-strip';
import { useModelProviderConsole } from '../hooks/use-model-provider-console';
import { ConnectionWizardDrawer } from '../connections/connection-wizard-drawer';
import { DeploymentEditorDrawer } from '../deployments/deployment-editor-drawer';

type ConsoleTab = 'connections' | 'deployments';
type ActionFeedback = { severity: 'error' | 'success'; message: string };

export function getModelProbeFeedback(
  displayName: string,
  operation: '连接测试' | '深度探测',
  result: Pick<ModelProbeResult, 'status' | 'steps'>
): ActionFeedback {
  if (result.status === 'PASSED') {
    return { severity: 'success', message: `${displayName} ${operation}通过。` };
  }

  const reason = result.steps.find((step) => step.status === 'FAILED')?.message;
  return {
    severity: 'error',
    message: reason
      ? `${displayName} ${operation}失败：${reason}`
      : `${displayName} ${operation}失败。请检查连接、模型 ID 与能力配置。`,
  };
}

export function ModelProvidersPageView() {
  return (
    <HasPermission roles={['SUPER_ADMIN']} fallback={<ModelProvidersView unauthorized />}>
      <ModelProvidersView />
    </HasPermission>
  );
}

export function ModelProvidersView({ unauthorized = false }: { unauthorized?: boolean }) {
  const { adapters, connections, deployments, summary, loading, error, setError, refresh } =
    useModelProviderConsole(!unauthorized);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab: ConsoleTab = requestedTab === 'deployments' ? requestedTab : 'connections';
  const [connectionEditorOpen, setConnectionEditorOpen] = useState(false);
  const [deploymentEditorOpen, setDeploymentEditorOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ModelConnection>();
  const [editingDeployment, setEditingDeployment] = useState<ModelDeployment>();
  const [deletingConnection, setDeletingConnection] = useState<ModelConnection>();
  const [deletingDeployment, setDeletingDeployment] = useState<ModelDeployment>();
  const [probingDeployment, setProbingDeployment] = useState<ModelDeployment>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const perform = async <T,>(
    id: string,
    action: () => Promise<T>,
    feedback: string | ((result: T) => ActionFeedback)
  ) => {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      const result = await action();
      await refresh();
      const outcome = typeof feedback === 'string' ? { severity: 'success' as const, message: feedback } : feedback(result);
      if (outcome.severity === 'error') {
        setError(outcome.message);
      } else {
        setNotice(outcome.message);
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  const requestConnectionDelete = async (connection: ModelConnection) => {
    setBusyId(connection.id);
    try {
      const impact = await getModelConnectionDeleteImpact(connection.id);
      if (!impact.canDelete) {
        setError(impact.message);
        return;
      }
      setDeletingConnection(connection);
    } catch (impactError) {
      setError(impactError instanceof Error ? impactError.message : '删除影响检查失败');
    } finally {
      setBusyId(null);
    }
  };

  const requestDeploymentDelete = async (deployment: ModelDeployment) => {
    setBusyId(deployment.id);
    try {
      const impact = await getModelDeploymentDeleteImpact(deployment.id);
      if (!impact.canDelete) {
        setError(impact.message);
        return;
      }
      setDeletingDeployment(deployment);
    } catch (impactError) {
      setError(impactError instanceof Error ? impactError.message : '删除影响检查失败');
    } finally {
      setBusyId(null);
    }
  };

  if (unauthorized) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="warning">只有超级管理员可以访问模型供应商控制台。</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'flex-end' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              模型供应商控制台
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              统一管理协议接入、模型部署、推理控制、数据边界与活动路由
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={() => void refresh()}
              disabled={loading}
            >
              刷新状态
            </Button>
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => {
                setEditingConnection(undefined);
                setConnectionEditorOpen(true);
              }}
            >
              接入供应商
            </Button>
          </Stack>
        </Stack>

        <ProviderStatusStrip summary={summary} loading={loading} />

        {error ? (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert severity="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        ) : null}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={(_event, value: ConsoleTab) =>
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (value === 'connections') next.delete('tab');
                else next.set('tab', value);
                return next;
              })
            }
            aria-label="模型供应商控制台分区"
          >
            <Tab value="connections" label={`接入点 ${connections.length}`} />
            <Tab value="deployments" label={`模型部署 ${deployments.length}`} />
          </Tabs>
        </Box>

        {tab === 'connections' ? (
          <ConnectionList
            items={connections}
            loading={loading}
            busyId={busyId}
            onCreate={() => {
              setEditingConnection(undefined);
              setConnectionEditorOpen(true);
            }}
            onEdit={(connection) => {
              setEditingConnection(connection);
              setConnectionEditorOpen(true);
            }}
            onTest={(connection) =>
              void perform(
                connection.id,
                () => testModelConnection(connection.id),
                (result) => getModelProbeFeedback(connection.displayName, '连接测试', result)
              )
            }
            onToggle={(connection) =>
              void perform(
                connection.id,
                () =>
                  updateModelConnection({
                    id: connection.id,
                    version: connection.version,
                    enabled: !connection.enabled,
                  }),
                `${connection.displayName} 已${connection.enabled ? '停用' : '启用'}。`
              )
            }
            onDelete={(connection) => void requestConnectionDelete(connection)}
          />
        ) : null}

        {tab === 'deployments' ? (
          <DeploymentTable
            items={deployments}
            loading={loading}
            busyId={busyId}
            onCreate={() => {
              setEditingDeployment(undefined);
              setDeploymentEditorOpen(true);
            }}
            onEdit={(deployment) => {
              setEditingDeployment(deployment);
              setDeploymentEditorOpen(true);
            }}
            onProbe={setProbingDeployment}
            onToggle={(deployment) =>
              void perform(
                deployment.id,
                () =>
                  updateModelDeployment({
                    id: deployment.id,
                    version: deployment.version,
                    enabled: !deployment.enabled,
                  }),
                deployment.enabled
                  ? `${deployment.displayName} 已停用，并已从活动路由移除。`
                  : `${deployment.displayName} 已启用，并已同步到活动路由。`
              )
            }
            onDelete={(deployment) => void requestDeploymentDelete(deployment)}
          />
        ) : null}

      </Stack>

      <ConnectionWizardDrawer
        open={connectionEditorOpen}
        connection={editingConnection}
        adapters={adapters}
        onClose={() => {
          setConnectionEditorOpen(false);
          setEditingConnection(undefined);
        }}
        onChanged={refresh}
      />
      <DeploymentEditorDrawer
        open={deploymentEditorOpen}
        deployment={editingDeployment}
        connections={connections}
        adapters={adapters}
        onClose={() => {
          setDeploymentEditorOpen(false);
          setEditingDeployment(undefined);
        }}
        onChanged={refresh}
      />

      <ConfirmDialog
        open={Boolean(probingDeployment)}
        title="执行深度能力探测"
        content={
          <Typography variant="body2">
            将向 <strong>{probingDeployment?.displayName}</strong>{' '}
            按当前默认推理策略、输出上限和声明能力发送一至两次最小请求，可能产生少量费用。继续吗？
          </Typography>
        }
        confirmLabel="确认并探测"
        confirmColor="warning"
        submitting={Boolean(probingDeployment && busyId === probingDeployment.id)}
        onClose={() => setProbingDeployment(undefined)}
        onConfirm={() => {
          const target = probingDeployment;
          if (!target) return;
          void perform(target.id, () => probeModelDeployment(target.id, true), (result) =>
            getModelProbeFeedback(target.displayName, '深度探测', result)
          ).finally(
            () => setProbingDeployment(undefined)
          );
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingConnection)}
        title="删除供应商连接"
        content={`确定删除 ${deletingConnection?.displayName ?? ''}？此操作不可撤销。`}
        submitting={Boolean(deletingConnection && busyId === deletingConnection.id)}
        onClose={() => setDeletingConnection(undefined)}
        onConfirm={() => {
          const target = deletingConnection;
          if (!target) return;
          void perform(target.id, () => deleteModelConnection(target.id), `${target.displayName} 已删除。`).finally(() =>
            setDeletingConnection(undefined)
          );
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingDeployment)}
        title="删除模型部署"
        content={`确定删除 ${deletingDeployment?.displayName ?? ''}？此操作不可撤销。`}
        submitting={Boolean(deletingDeployment && busyId === deletingDeployment.id)}
        onClose={() => setDeletingDeployment(undefined)}
        onConfirm={() => {
          const target = deletingDeployment;
          if (!target) return;
          void perform(target.id, () => deleteModelDeployment(target.id), `${target.displayName} 已删除。`).finally(() =>
            setDeletingDeployment(undefined)
          );
        }}
      />
    </DashboardContent>
  );
}
