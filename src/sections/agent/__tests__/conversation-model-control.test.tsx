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
      capabilities: ['STREAMING', 'STRUCTURED_OUTPUT'],
      contextWindow: 128000,
      maxOutputTokens: 8192,
      costTier: 'LOW' as const,
      status: 'AVAILABLE' as const,
      reason: null,
    },
    {
      model: 'research-paused-v1',
      displayName: '暂停模型',
      provider: 'secondary',
      capabilities: ['STREAMING'],
      contextWindow: 32000,
      maxOutputTokens: 4096,
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

  it('手动模式只允许保存目录中可用的模型', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <ConversationModelControl policy="AUTO" preferredModel={null} saving={false} onSave={onSave} />
    );

    await user.click(screen.getByRole('button', { name: '自动模型' }));
    await user.click(screen.getByRole('button', { name: '指定模型' }));

    expect(screen.getByRole('dialog')).not.toHaveAttribute('data-color-scheme');
    await waitFor(() => expect(screen.getByText('快速研究')).toBeInTheDocument());
    expect(screen.getByText(/上下文 128K · 最大输出 8.2K/)).toBeInTheDocument();
    expect(screen.getByText('暂停模型')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();

    await user.click(screen.getByText('快速研究'));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith('MANUAL', 'research-fast-v1');
  });

  it('仅打开模型设置时请求目录，加载失败时禁止保存手动选择', async () => {
    vi.mocked(agentApi.listModels).mockRejectedValueOnce(new Error('目录不可用'));
    const onSave = vi.fn().mockResolvedValue(true);
    const { user } = renderWithProviders(
      <ConversationModelControl policy="AUTO" preferredModel={null} saving={false} onSave={onSave} />
    );

    expect(agentApi.listModels).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '自动模型' }));
    await user.click(screen.getByRole('button', { name: '指定模型' }));

    await waitFor(() => expect(screen.getByText('目录不可用')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });
});
