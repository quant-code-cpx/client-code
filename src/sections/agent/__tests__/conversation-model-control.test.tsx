import { screen, waitFor } from '@testing-library/react';

import { agentApi } from 'src/api/agent';
import { renderWithProviders } from 'src/test/test-utils';

import { ConversationModelControl } from '../components/conversation-model-control';

vi.mock('src/api/agent', () => ({
  agentApi: { listModels: vi.fn() },
}));

const models = {
  items: [
    {
      model: 'research-fast-v1',
      displayName: '快速研究',
      provider: 'primary',
      capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'REASONING_EFFORT'],
      reasoningEfforts: ['LOW', 'MEDIUM', 'HIGH'],
      defaultReasoningEffort: 'MEDIUM',
      contextWindow: 128000,
      maxOutputTokens: 8192,
      contextAccountingMode: 'SHARED_WINDOW' as const,
      completionTokenAccounting: 'REASONING_AND_VISIBLE' as const,
      supportedVerbosityLevels: ['LOW', 'MEDIUM', 'HIGH'],
      costTier: 'LOW' as const,
      status: 'AVAILABLE' as const,
      reason: null,
    },
    {
      model: 'research-standard-v1',
      displayName: '标准研究',
      provider: 'secondary',
      capabilities: ['STREAMING', 'STRUCTURED_OUTPUT'],
      reasoningEfforts: [],
      defaultReasoningEffort: null,
      contextWindow: 64000,
      maxOutputTokens: 4096,
      contextAccountingMode: 'SHARED_WINDOW' as const,
      completionTokenAccounting: 'REASONING_AND_VISIBLE' as const,
      supportedVerbosityLevels: [],
      costTier: 'MEDIUM' as const,
      status: 'AVAILABLE' as const,
      reason: null,
    },
    {
      model: 'research-paused-v1',
      displayName: '暂停模型',
      provider: 'secondary',
      capabilities: ['STREAMING'],
      reasoningEfforts: [],
      defaultReasoningEffort: null,
      contextWindow: 32000,
      maxOutputTokens: 4096,
      contextAccountingMode: 'SHARED_WINDOW' as const,
      completionTokenAccounting: 'REASONING_AND_VISIBLE' as const,
      supportedVerbosityLevels: [],
      costTier: 'HIGH' as const,
      status: 'UNAVAILABLE' as const,
      reason: '模型供应商暂时不可用',
    },
  ],
};

describe('ConversationModelControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(agentApi.listModels).mockResolvedValue(models);
  });

  it('用紧凑双选择器保存模型与该模型支持的思考强度', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <ConversationModelControl
        policy="AUTO"
        preferredModel={null}
        reasoningEffort={null}
        saving={false}
        onSave={onSave}
      />
    );

    expect(agentApi.listModels).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '自动模型' }));
    await waitFor(() => expect(screen.getByText('模型与思考强度')).toBeInTheDocument());

    const modelSelect = screen.getByRole('combobox', { name: '模型' });
    await user.click(modelSelect);
    await user.click(screen.getByRole('option', { name: /^快速研究/ }));

    const effortSelect = screen.getByRole('combobox', { name: '思考强度' });
    expect(effortSelect).toBeEnabled();
    await user.click(effortSelect);
    await user.click(screen.getByRole('option', { name: '高' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith('MANUAL', 'research-fast-v1', 'HIGH');
  });

  it('切换到不支持调节的模型时自动回到跟随模型', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <ConversationModelControl
        policy="MANUAL"
        preferredModel="research-fast-v1"
        reasoningEffort="HIGH"
        saving={false}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: 'research-fast-v1 · 高' }));
    await waitFor(() => expect(screen.getByText('模型与思考强度')).toBeInTheDocument());
    await user.click(screen.getByRole('combobox', { name: '模型' }));
    await user.click(screen.getByRole('option', { name: /^标准研究/ }));

    expect(screen.getByRole('combobox', { name: '思考强度' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith('MANUAL', 'research-standard-v1', null);
  });

  it('目录加载失败时显示重试并禁止保存', async () => {
    vi.mocked(agentApi.listModels).mockRejectedValueOnce(new Error('目录不可用'));
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <ConversationModelControl
        policy="AUTO"
        preferredModel={null}
        reasoningEffort={null}
        saving={false}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: '自动模型' }));

    await waitFor(() => expect(screen.getByText('目录不可用')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });
});
