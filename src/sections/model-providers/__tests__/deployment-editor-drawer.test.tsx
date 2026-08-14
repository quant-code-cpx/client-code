import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import * as ModelProviderApi from 'src/api/model-provider';

import { PROBE_STEP_LABELS } from '../model-provider.constants';
import { DeploymentEditorDrawer } from '../deployments/deployment-editor-drawer';

vi.mock('src/api/model-provider', async () => {
  const actual = await vi.importActual<typeof ModelProviderApi>('src/api/model-provider');
  return {
    ...actual,
    probeModelDeployment: vi.fn(),
    createModelDeployment: vi.fn(),
    updateModelDeployment: vi.fn(),
  };
});

const CONNECTION: ModelProviderApi.ModelConnection = {
  id: 'connection-1',
  connectionKey: 'deepseek',
  adapterKind: 'openai-chat-compatible',
  displayName: 'DeepSeek API',
  baseUrl: 'https://api.deepseek.com',
  apiKeyConfigured: true,
  apiKeyLastFour: 'test',
  enabled: true,
  version: 1,
  deploymentCount: 2,
  lastProbe: null,
  createdAt: '2026-07-25T04:34:50.477Z',
  updatedAt: '2026-07-25T05:59:02.669Z',
};

const SECOND_CONNECTION: ModelProviderApi.ModelConnection = {
  ...CONNECTION,
  id: 'connection-2',
  connectionKey: 'custom-gateway',
  displayName: '自定义网关',
};

const ADAPTER: ModelProviderApi.ModelAdapterDefinition = {
  kind: 'openai-chat-compatible',
  label: 'OpenAI Chat Compatible',
  transport: 'CHAT_COMPLETIONS',
  native: false,
  defaultBaseUrl: null,
  reasoningModes: ['AUTO', 'DISABLED', 'EFFORT'],
  builtInEfforts: ['NONE', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'XHIGH', 'MAX'],
  capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'TOOL_CALLING', 'REASONING_EFFORT'],
  probeLevels: ['AUTH', 'STREAM'],
  summary: 'OpenAI Chat Compatible',
};

const DEPLOYMENT: ModelProviderApi.ModelDeployment = {
  id: 'deployment-1',
  connectionId: CONNECTION.id,
  connectionKey: CONNECTION.connectionKey,
  connectionName: CONNECTION.displayName,
  adapterKind: CONNECTION.adapterKind,
  modelId: 'deepseek-v4-flash',
  displayName: 'deepseek-v4-flash',
  priority: 10,
  costTier: 'MEDIUM',
  contextWindow: 128000,
  maxOutputTokens: 8192,
  capabilities: [
    'STREAMING',
    'STRUCTURED_OUTPUT',
    'TOOL_CALLING',
    'PARALLEL_TOOL_CALLING',
    'REASONING_EFFORT',
  ],
  reasoningMode: 'EFFORT',
  reasoningEfforts: ['LOW', 'MEDIUM', 'HIGH'],
  defaultReasoningEffort: null,
  reasoningBudgetTokens: null,
  dataClasses: ['PUBLIC', 'USER_PRIVATE'],
  timeoutMs: 120000,
  maxRetries: 2,
  retryBaseMs: 200,
  enabled: true,
  version: 1,
  lastProbe: null,
  createdAt: '2026-07-25T05:58:18.496Z',
  updatedAt: '2026-07-25T05:58:18.496Z',
};

describe('DeploymentEditorDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('探测步骤契约覆盖后端返回的全部阶段', () => {
    expect(ModelProviderApi.MODEL_PROBE_STEP_KEYS).toEqual([
      'URL_POLICY',
      'TLS',
      'AUTH',
      'MODEL',
      'REASONING',
      'STRUCTURED_OUTPUT',
      'TOOLS',
      'VISION',
      'STREAM',
    ]);
    expect(ModelProviderApi.MODEL_PROBE_STEP_KEYS.every((key) => Boolean(PROBE_STEP_LABELS[key]))).toBe(true);
  });

  it('默认推理档位为空时收缩标签并显示独立占位项', async () => {
    renderDrawer({ deployment: DEPLOYMENT });

    const select = await screen.findByRole('combobox', { name: '默认推理档位' });
    const label = (select as HTMLSelectElement).labels?.[0];

    expect(select).toHaveValue('');
    expect(label).toHaveClass('MuiInputLabel-shrink');
    expect(screen.getByRole('option', { name: '请选择推理档位' })).toBeInTheDocument();
  });

  it('新建部署且没有连接时供应商标签不会与占位项重叠', async () => {
    renderDrawer({ connections: [] });

    const select = await screen.findByRole('combobox', { name: '供应商连接' });
    const label = (select as HTMLSelectElement).labels?.[0];

    expect(select).toHaveValue('');
    expect(label).toHaveClass('MuiInputLabel-shrink');
    expect(screen.getByRole('option', { name: '请选择连接' })).toBeInTheDocument();
  });

  it('展示全部标准能力，并在切换连接时保留管理员声明', async () => {
    renderDrawer({ deployment: DEPLOYMENT, connections: [CONNECTION, SECOND_CONNECTION] });

    expect(await screen.findByRole('button', { name: '并行工具' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '视觉输入' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/不受适配器预设限制/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: '供应商连接' }), {
      target: { value: SECOND_CONNECTION.id },
    });

    expect(screen.getByRole('button', { name: '并行工具' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('明确模型超时是单次调用配置，整条研究时限会自动计算', async () => {
    renderDrawer({ deployment: DEPLOYMENT });

    fireEvent.click(await screen.findByText('运行与路由参数'));

    expect(screen.getByRole('spinbutton', { name: '单次模型调用超时（毫秒）' })).toHaveValue(120000);
    expect(screen.getByText('整条研究时限会按工作流阶段与重试预算自动计算')).toBeInTheDocument();
  });

  it('新建部署保持完整默认配置并只在提交时修剪文本', async () => {
    vi.mocked(ModelProviderApi.createModelDeployment).mockResolvedValue({
      ...DEPLOYMENT,
      modelId: 'gpt-5.6-sol',
      displayName: '主模型',
      enabled: false,
    });
    renderDrawer({});

    expect(await screen.findByRole('combobox', { name: '供应商连接' })).toHaveValue(
      CONNECTION.id
    );
    fireEvent.change(screen.getByRole('textbox', { name: '模型 ID' }), {
      target: { value: '  gpt-5.6-sol  ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '显示名称' }), {
      target: { value: '  主模型  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));

    await waitFor(() =>
      expect(ModelProviderApi.createModelDeployment).toHaveBeenCalledWith({
        connectionId: CONNECTION.id,
        modelId: 'gpt-5.6-sol',
        displayName: '主模型',
        priority: 10,
        costTier: 'MEDIUM',
        contextWindow: 128000,
        maxOutputTokens: 8192,
        capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'TOOL_CALLING'],
        reasoningMode: 'AUTO',
        reasoningEfforts: ['NONE', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'XHIGH', 'MAX'],
        defaultReasoningEffort: 'MEDIUM',
        dataClasses: ['PUBLIC', 'USER_PRIVATE'],
        timeoutMs: 120000,
        maxRetries: 2,
        retryBaseMs: 200,
        enabled: false,
      })
    );
  });

  it('深度探测失败时展示具体阶段、HTTP 诊断和每步结果', async () => {
    vi.mocked(ModelProviderApi.probeModelDeployment).mockResolvedValue({
      id: DEPLOYMENT.id,
      status: 'FAILED',
      durationMs: 942,
      checkedAt: '2026-08-07T12:00:00.000Z',
      providerRequestId: null,
      steps: [
        { key: 'AUTH', status: 'PASSED', durationMs: 0, message: '复用最近一次连接测试结果' },
        {
          key: 'STRUCTURED_OUTPUT',
          status: 'FAILED',
          durationMs: 942,
          message: '模型供应商返回 HTTP 502，请检查上游服务状态或协议兼容日志',
        },
      ],
    });
    renderDrawer({ deployment: DEPLOYMENT });

    expect(
      await screen.findByText(/按当前默认推理策略、最大输出上限、结构化输出和工具能力/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '深度探测（可能计费）' }));

    await waitFor(() =>
      expect(ModelProviderApi.probeModelDeployment).toHaveBeenCalledWith(DEPLOYMENT.id, true)
    );
    expect((await screen.findAllByText('结构化输出')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/HTTP 502/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/深度探测\s*失败\s*·\s*942 ms/)).toBeInTheDocument();
  });
});

function renderDrawer({
  deployment,
  connections = [CONNECTION],
}: {
  deployment?: ModelProviderApi.ModelDeployment;
  connections?: ModelProviderApi.ModelConnection[];
}) {
  return render(
    <DeploymentEditorDrawer
      open
      deployment={deployment}
      connections={connections}
      adapters={[ADAPTER]}
      onClose={vi.fn()}
      onChanged={vi.fn().mockResolvedValue(undefined)}
    />
  );
}
