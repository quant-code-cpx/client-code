import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ConversationModelControl } from '../components/conversation-model-control';

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
  });

  it('默认选中具体模型，且模型列表不再提供自动选择', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <ConversationModelControl
        preferredModel={null}
        reasoningEffort={null}
        models={models.items}
        defaultModel="research-standard-v1"
        loading={false}
        loadError={null}
        saving={false}
        onReloadModels={vi.fn()}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: '标准研究' }));
    await waitFor(() => expect(screen.getByText('模型与思考强度')).toBeInTheDocument());

    const modelSelect = screen.getByRole('combobox', { name: '模型' });
    await user.click(modelSelect);
    expect(screen.queryByRole('option', { name: '自动选择' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /^快速研究/ }));

    const effortSelect = screen.getByRole('combobox', { name: '思考强度' });
    expect(effortSelect).toBeEnabled();
    await user.click(effortSelect);
    await user.click(screen.getByRole('option', { name: '高' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith('research-fast-v1', 'HIGH');
  });

  it('切换到不支持调节的模型时自动回到跟随模型', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <ConversationModelControl
        preferredModel="research-fast-v1"
        reasoningEffort="HIGH"
        models={models.items}
        defaultModel="research-fast-v1"
        loading={false}
        loadError={null}
        saving={false}
        onReloadModels={vi.fn()}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: '快速研究 · 高' }));
    await waitFor(() => expect(screen.getByText('模型与思考强度')).toBeInTheDocument());
    await user.click(screen.getByRole('combobox', { name: '模型' }));
    await user.click(screen.getByRole('option', { name: /^标准研究/ }));

    expect(screen.getByRole('combobox', { name: '思考强度' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith('research-standard-v1', null);
  });

  it('目录加载失败时显示重试并禁止保存', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onReloadModels = vi.fn();
    const { user } = renderWithProviders(
      <ConversationModelControl
        preferredModel={null}
        reasoningEffort={null}
        models={[]}
        defaultModel={null}
        loading={false}
        loadError="目录不可用"
        saving={false}
        onReloadModels={onReloadModels}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: '选择模型' }));

    expect(screen.getByText('目录不可用')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(onReloadModels).toHaveBeenCalledOnce();
  });
});
