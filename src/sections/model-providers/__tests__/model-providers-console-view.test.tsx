import type { ReactNode } from 'react';
import type { ModelDeployment, ModelConnection, ModelProbeResult } from 'src/api/model-provider';

import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { render, screen, within, waitFor } from '@testing-library/react';

import { ThemeProvider } from '@mui/material/styles';

import { createTheme } from 'src/theme/create-theme';

const {
  mockRefresh,
  mockSetError,
  mockTestModelConnection,
  mockProbeModelDeployment,
  mockDeleteModelConnection,
  mockDeleteModelDeployment,
  mockUpdateModelConnection,
  mockUpdateModelDeployment,
  mockGetModelConnectionDeleteImpact,
  mockGetModelDeploymentDeleteImpact,
} = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockSetError: vi.fn(),
  mockTestModelConnection: vi.fn(),
  mockProbeModelDeployment: vi.fn(),
  mockDeleteModelConnection: vi.fn(),
  mockDeleteModelDeployment: vi.fn(),
  mockUpdateModelConnection: vi.fn(),
  mockUpdateModelDeployment: vi.fn(),
  mockGetModelConnectionDeleteImpact: vi.fn(),
  mockGetModelDeploymentDeleteImpact: vi.fn(),
}));

const connection: ModelConnection = {
  id: 'connection-1',
  connectionKey: 'primary',
  adapterKind: 'openai-responses',
  displayName: '主连接',
  baseUrl: 'https://api.openai.com/v1',
  apiKeyConfigured: true,
  apiKeyLastFour: '1234',
  enabled: true,
  version: 2,
  deploymentCount: 1,
  lastProbe: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

const deployment: ModelDeployment = {
  id: 'deployment-1',
  connectionId: connection.id,
  connectionKey: connection.connectionKey,
  connectionName: connection.displayName,
  adapterKind: 'openai-responses',
  modelId: 'gpt-5.6',
  displayName: 'GPT 5.6',
  priority: 10,
  costTier: 'HIGH',
  contextWindow: 200000,
  maxOutputTokens: 32000,
  capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'TOOL_CALLING', 'VISION'],
  reasoningMode: 'EFFORT',
  reasoningEfforts: ['LOW', 'HIGH'],
  defaultReasoningEffort: 'HIGH',
  reasoningBudgetTokens: null,
  dataClasses: ['PUBLIC'],
  timeoutMs: 30000,
  maxRetries: 2,
  retryBaseMs: 500,
  enabled: true,
  version: 3,
  lastProbe: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

const consoleState = {
  adapters: [],
  connections: [connection],
  deployments: [deployment],
  summary: {
    activeDeployments: 1,
    verifiedConnections: 0,
    failedProbes: 0,
    configurationIssues: 0,
    activeVersion: null,
  },
  loading: false,
  error: '',
  setError: mockSetError,
  refresh: mockRefresh,
};

vi.mock('src/api/model-provider', () => ({
  testModelConnection: mockTestModelConnection,
  probeModelDeployment: mockProbeModelDeployment,
  deleteModelConnection: mockDeleteModelConnection,
  deleteModelDeployment: mockDeleteModelDeployment,
  updateModelConnection: mockUpdateModelConnection,
  updateModelDeployment: mockUpdateModelDeployment,
  getModelConnectionDeleteImpact: mockGetModelConnectionDeleteImpact,
  getModelDeploymentDeleteImpact: mockGetModelDeploymentDeleteImpact,
}));
vi.mock('../hooks/use-model-provider-console', () => ({
  useModelProviderConsole: () => consoleState,
}));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('../connections/connection-wizard-drawer', () => ({
  ConnectionWizardDrawer: () => null,
}));
vi.mock('../deployments/deployment-editor-drawer', () => ({
  DeploymentEditorDrawer: () => null,
}));

import { ModelProvidersView } from '../view/model-providers-view';

const theme = createTheme();

function renderView(path = '/settings/model-providers') {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <ModelProvidersView />
        </MemoryRouter>
      </ThemeProvider>
    ),
  };
}

const passedProbe: ModelProbeResult = {
  id: 'probe-1',
  status: 'PASSED',
  durationMs: 42,
  checkedAt: '2026-08-12T00:00:00.000Z',
  steps: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRefresh.mockResolvedValue(undefined);
  mockUpdateModelConnection.mockResolvedValue(connection);
  mockUpdateModelDeployment.mockResolvedValue(deployment);
  mockTestModelConnection.mockResolvedValue(passedProbe);
  mockProbeModelDeployment.mockResolvedValue(passedProbe);
  mockDeleteModelConnection.mockResolvedValue({ id: connection.id, deleted: true });
  mockDeleteModelDeployment.mockResolvedValue({ id: deployment.id, deleted: true });
  mockGetModelConnectionDeleteImpact.mockResolvedValue({
    id: connection.id,
    canDelete: true,
    message: '可删除',
  });
  mockGetModelDeploymentDeleteImpact.mockResolvedValue({
    id: deployment.id,
    canDelete: true,
    message: '可删除',
  });
});

describe('ModelProvidersView', () => {
  it('连接开关提交 id/version/enabled，测试后刷新并展示成功反馈', async () => {
    const { user } = renderView();

    expect(screen.getByText('主连接')).toBeInTheDocument();
    expect(screen.getByText('未测试')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '主连接 启用状态' }));
    expect(mockUpdateModelConnection).toHaveBeenCalledWith({
      id: 'connection-1',
      version: 2,
      enabled: false,
    });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: '测试 主连接' }));
    expect(mockTestModelConnection).toHaveBeenCalledWith('connection-1');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('主连接 连接测试通过。')).toBeInTheDocument();
  });

  it('受依赖保护的连接不打开确认框，直接展示影响消息', async () => {
    mockGetModelConnectionDeleteImpact.mockResolvedValue({
      id: connection.id,
      canDelete: false,
      message: '仍被 GPT 5.6 引用，不能删除',
    });
    const { user } = renderView();

    await user.click(screen.getByRole('button', { name: '删除 主连接' }));
    expect(mockGetModelConnectionDeleteImpact).toHaveBeenCalledWith('connection-1');
    expect(mockSetError).toHaveBeenCalledWith('仍被 GPT 5.6 引用，不能删除');
    expect(screen.queryByRole('dialog', { name: '删除供应商连接' })).not.toBeInTheDocument();
  });

  it('部署深度探测需二次确认，提交 billable Body 语义并展示失败步骤', async () => {
    mockProbeModelDeployment.mockResolvedValue({
      ...passedProbe,
      status: 'FAILED',
      steps: [
        { key: 'MODEL', status: 'FAILED', durationMs: 20, message: '模型 ID 不存在' },
      ],
    });
    const { user } = renderView('/settings/model-providers?tab=deployments');

    expect(screen.getByText('GPT 5.6')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '探测 GPT 5.6' }));
    const dialog = screen.getByRole('dialog', { name: '执行深度能力探测' });
    expect(dialog).toHaveTextContent('可能产生少量费用');
    await user.click(within(dialog).getByRole('button', { name: '确认并探测' }));

    expect(mockProbeModelDeployment).toHaveBeenCalledWith('deployment-1', true);
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(mockSetError).toHaveBeenCalledWith('GPT 5.6 深度探测失败：模型 ID 不存在');
  });

  it('无权限态只展示警告，不渲染管理操作', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ModelProvidersView unauthorized />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText('只有超级管理员可以访问模型供应商控制台。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '接入供应商' })).not.toBeInTheDocument();
  });
});
