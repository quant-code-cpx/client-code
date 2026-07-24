import type { ReactNode } from 'react';
import type { AgentResponse } from 'src/api/agent';

import { screen, within, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AgentMemoryDrawer } from '../components/agent-memory-drawer';

const mocks = vi.hoisted(() => ({
  createMemory: vi.fn(),
  deleteMemory: vi.fn(),
  listMemories: vi.fn(),
  updateMemory: vi.fn(),
}));

vi.mock('src/api/agent', () => ({ agentApi: mocks }));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

type AgentMemory = AgentResponse<'/agent/memories/list'>['items'][number];

const memory: AgentMemory = {
  memoryId: 'memory_1',
  category: 'PREFERENCE',
  key: 'response.style',
  value: { style: 'concise' } as never,
  sensitivity: 'NORMAL',
  status: 'CONFIRMED',
  sourceConversationId: null,
  sourceMessageId: null,
  confidence: 1,
  version: 1,
  validFrom: '2026-07-21T00:00:00.000Z',
  confirmedAt: '2026-07-21T00:00:00.000Z',
  expiresAt: '2027-07-21T00:00:00.000Z',
  revokedAt: null,
  deletedAt: null,
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
};

describe('AgentMemoryDrawer', () => {
  beforeEach(() => {
    mocks.listMemories.mockReset();
    mocks.createMemory.mockReset();
    mocks.updateMemory.mockReset();
    mocks.deleteMemory.mockReset();
    mocks.listMemories.mockResolvedValue({ items: [memory], nextCursor: null });
  });

  it('仅展示当前用户已确认的记忆，并保留来源、到期和更新时间', async () => {
    renderWithProviders(<AgentMemoryDrawer open onClose={vi.fn()} />);

    expect(await screen.findByText('response.style')).toBeInTheDocument();
    expect(screen.getByText('由你手动保存', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('到期：', { exact: false })).toBeInTheDocument();
    expect(mocks.listMemories).toHaveBeenCalledWith({
      cursor: null,
      limit: 100,
      includeInactive: false,
    });
  });

  it('删除确认后立即从新 Run 候选列表移除记忆', async () => {
    mocks.deleteMemory.mockResolvedValue({
      memoryId: memory.memoryId,
      status: 'REVOKED',
      deletedAt: '2026-07-21T00:00:00.000Z',
    });
    const { user } = renderWithProviders(<AgentMemoryDrawer open onClose={vi.fn()} />);

    await screen.findByText('response.style');
    await user.click(screen.getByRole('button', { name: '删除' }));

    const dialog = await screen.findByRole('dialog', { name: '删除长期记忆' });
    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    await waitFor(() => expect(mocks.deleteMemory).toHaveBeenCalledWith({ memoryId: 'memory_1' }));
    await waitFor(() => expect(screen.queryByText('response.style')).not.toBeInTheDocument());
  });

  it('保存前要求用户明确确认，且将 JSON 作为结构化值提交', async () => {
    mocks.createMemory.mockResolvedValue({ ...memory, memoryId: 'memory_2', key: 'research.focus' });
    const { user } = renderWithProviders(<AgentMemoryDrawer open onClose={vi.fn()} />);

    await screen.findByText('response.style');
    await user.click(screen.getByRole('button', { name: '保存长期记忆' }));
    await user.clear(screen.getByLabelText('记忆键'));
    await user.type(screen.getByLabelText('记忆键'), 'research.focus');
    fireEvent.change(screen.getByLabelText('记忆内容（JSON）'), {
      target: { value: '{"scope":"A股"}' },
    });

    expect(screen.getByRole('button', { name: '确认保存' })).toBeDisabled();
    await user.click(screen.getByLabelText('我确认将此内容保存为长期记忆'));
    await user.click(screen.getByRole('button', { name: '确认保存' }));

    await waitFor(() =>
      expect(mocks.createMemory).toHaveBeenCalledWith({
        category: 'PREFERENCE',
        key: 'research.focus',
        value: { scope: 'A股' },
        sensitivity: 'NORMAL',
        topic: 'GENERAL',
        confirmation: true,
        sourceConversationId: null,
        sourceMessageId: null,
        confidence: 1,
        expiresAt: null,
      })
    );
  });
});
