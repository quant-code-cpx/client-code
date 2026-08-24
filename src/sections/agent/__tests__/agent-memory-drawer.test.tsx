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

    expect(document.querySelector('.MuiDrawer-paper')).not.toHaveAttribute('data-color-scheme');
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
        clientRequestId: expect.any(String),
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

  it('create 响应不确定时按规范化命令语义复用 requestId，真实语义变化才换新 ID', async () => {
    mocks.createMemory
      .mockRejectedValueOnce(new Error('network response lost'))
      .mockRejectedValueOnce(new Error('network response lost again'))
      .mockResolvedValue({ ...memory, memoryId: 'memory_2', key: 'research.focus' });
    const { user } = renderWithProviders(<AgentMemoryDrawer open onClose={vi.fn()} />);

    await screen.findByText('response.style');
    await user.click(screen.getByRole('button', { name: '保存长期记忆' }));
    await user.clear(screen.getByLabelText('记忆键'));
    await user.type(screen.getByLabelText('记忆键'), 'research.focus');
    const confirmation = screen.getByLabelText('我确认将此内容保存为长期记忆');
    const valueInput = screen.getByLabelText('记忆内容（JSON）');
    fireEvent.change(valueInput, { target: { value: '{"scope":"A股","style":"concise"}' } });
    await user.click(confirmation);

    await user.click(screen.getByRole('button', { name: '确认保存' }));
    await waitFor(() => expect(mocks.createMemory).toHaveBeenCalledTimes(1));
    const firstRequestId = mocks.createMemory.mock.calls[0][0].clientRequestId;
    await screen.findByText('network response lost');

    fireEvent.change(valueInput, { target: { value: '{"scope":"港股"}' } });
    await user.click(confirmation);
    await user.click(confirmation);
    fireEvent.change(valueInput, { target: { value: '{"style":"concise","scope":"A股"}' } });
    await user.click(screen.getByRole('button', { name: '确认保存' }));
    await waitFor(() => expect(mocks.createMemory).toHaveBeenCalledTimes(2));
    expect(mocks.createMemory.mock.calls[1][0].clientRequestId).toBe(firstRequestId);
    await screen.findByText('network response lost again');

    fireEvent.change(valueInput, { target: { value: '{"scope":"港股"}' } });
    await user.click(screen.getByRole('button', { name: '确认保存' }));
    await waitFor(() => expect(mocks.createMemory).toHaveBeenCalledTimes(3));
    expect(mocks.createMemory.mock.calls[2][0].clientRequestId).not.toBe(firstRequestId);
  });

  it('update 响应不确定时原样重试复用同一 requestId', async () => {
    mocks.updateMemory
      .mockRejectedValueOnce(new Error('update response lost'))
      .mockResolvedValue({ ...memory, memoryId: 'memory_2', version: 2 });
    const { user } = renderWithProviders(<AgentMemoryDrawer open onClose={vi.fn()} />);

    await screen.findByText('response.style');
    await user.click(screen.getByRole('button', { name: '纠正' }));
    await user.click(screen.getByLabelText('我确认以此内容纠正长期记忆'));
    await user.click(screen.getByRole('button', { name: '确认保存' }));
    await waitFor(() => expect(mocks.updateMemory).toHaveBeenCalledTimes(1));
    const firstRequestId = mocks.updateMemory.mock.calls[0][0].clientRequestId;
    await screen.findByText('update response lost');

    await user.click(screen.getByRole('button', { name: '确认保存' }));
    await waitFor(() => expect(mocks.updateMemory).toHaveBeenCalledTimes(2));
    expect(mocks.updateMemory.mock.calls[1][0].clientRequestId).toBe(firstRequestId);
  });

  it('纠正返回新 memoryId 时替换同键旧版本，不重复计入有效记忆', async () => {
    mocks.updateMemory.mockResolvedValue({
      ...memory,
      memoryId: 'memory_2',
      value: { style: 'detailed' },
      version: 2,
    });
    const { user } = renderWithProviders(<AgentMemoryDrawer open onClose={vi.fn()} />);

    await screen.findByText('response.style');
    await user.click(screen.getByRole('button', { name: '纠正' }));
    fireEvent.change(screen.getByLabelText('记忆内容（JSON）'), {
      target: { value: '{"style":"detailed"}' },
    });
    await user.click(screen.getByLabelText('我确认以此内容纠正长期记忆'));
    await user.click(screen.getByRole('button', { name: '确认保存' }));

    await waitFor(() => expect(mocks.updateMemory).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getAllByText('response.style')).toHaveLength(1));
    const drawer = document.querySelector('.MuiDrawer-paper');
    expect(drawer).not.toBeNull();
    expect(within(drawer as HTMLElement).getByText(/"detailed"/)).toBeInTheDocument();
    const effectiveMemorySummary = screen.getByText('有效记忆').parentElement;
    expect(effectiveMemorySummary).not.toBeNull();
    expect(within(effectiveMemorySummary!).getByText('1')).toBeInTheDocument();
  });
});
