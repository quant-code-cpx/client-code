import type * as ReactRouterDomModule from 'react-router-dom';

import { useState } from 'react';
import { act, screen, waitFor, configure } from '@testing-library/react';

import { ApiError } from 'src/api/client';
import { renderWithProviders } from 'src/test/test-utils';
import ResearchNoteDetailPage from 'src/pages/research-note-detail';
import { createAuthenticatedContext } from 'src/test/factories/auth-context';

import { ResearchNoteEditor } from '../research-note-editor';
import { ResearchNoteDetailView } from '../view/research-note-detail-view';

const mocks = vi.hoisted(() => ({
  noteId: '99999',
  searchParams: new URLSearchParams(),
  setSearchParams: vi.fn(),
  getNoteById: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDomModule>();
  return {
    ...actual,
    useParams: () => ({ noteId: mocks.noteId }),
    useSearchParams: () => [mocks.searchParams, mocks.setSearchParams],
  };
});

vi.mock('src/api/research-note', () => ({
  getNoteById: mocks.getNoteById,
  createNote: mocks.createNote,
  updateNote: mocks.updateNote,
  deleteNote: mocks.deleteNote,
}));

function renderDetail(noteId: string) {
  mocks.noteId = noteId;
  return renderWithProviders(<ResearchNoteDetailView />, {
    authContext: createAuthenticatedContext(),
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function ResearchNoteRouteHarness() {
  const [activeNoteId, setActiveNoteId] = useState('1');
  mocks.noteId = activeNoteId;

  return (
    <>
      <button type="button" onClick={() => setActiveNoteId('999')}>
        切换笔记
      </button>
      <ResearchNoteDetailPage />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ResearchNoteDetailView', () => {
  it('笔记不存在时禁用所有编辑操作', async () => {
    mocks.getNoteById.mockRejectedValueOnce(new ApiError('笔记不存在', { status: 404 }));

    const { user } = renderDetail('99999');

    expect(await screen.findByText('笔记不存在')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '置顶' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '历史版本（即将上线）' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'AI 摘要（即将上线）' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '保存（⌘S）' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '编辑' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '预览' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '标题' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: '关联股票（可选）' })).toBeDisabled();
    expect(screen.getByPlaceholderText('输入标签后按回车添加')).toBeDisabled();
    expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();

    await user.keyboard('{Meta>}s{/Meta}');
    await waitFor(() => {
      expect(mocks.createNote).not.toHaveBeenCalled();
      expect(mocks.updateNote).not.toHaveBeenCalled();
      expect(mocks.deleteNote).not.toHaveBeenCalled();
    });
  });

  it('瞬时加载失败可重试，成功后恢复内容和编辑操作', async () => {
    mocks.getNoteById
      .mockRejectedValueOnce(new ApiError('请求超时，请稍后重试', { status: 408 }))
      .mockResolvedValueOnce({
        id: 7,
        tsCode: '600000.SH',
        title: '重试后恢复的笔记',
        content: '正文内容',
        tags: ['回归'],
        isPinned: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-09T00:00:00.000Z',
      });

    const { user } = renderDetail('7');

    expect(await screen.findByText('请求超时，请稍后重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存（⌘S）' })).toBeDisabled();
    await user.keyboard('{Meta>}s{/Meta}');
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.updateNote).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByDisplayValue('重试后恢复的笔记')).toBeEnabled();
    expect(screen.getByRole('button', { name: '保存（⌘S）' })).toBeEnabled();
    expect(mocks.getNoteById).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('请求超时，请稍后重试')).not.toBeInTheDocument();
  });

  it('无效笔记 ID 不发起请求并禁用编辑', async () => {
    renderDetail('invalid');

    expect(await screen.findByText('无效的笔记 ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存（⌘S）' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '标题' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument();
    expect(mocks.getNoteById).not.toHaveBeenCalled();
  });

  it('StrictMode 乱序加载只应用最新 attempt', async () => {
    const latestNote = {
      id: 7,
      tsCode: null,
      title: '最新笔记',
      content: '最新内容',
      tags: [],
      isPinned: false,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    };
    const staleRequest = deferred<typeof latestNote>();
    const latestRequest = deferred<typeof latestNote>();
    mocks.getNoteById
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(latestRequest.promise);

    mocks.noteId = '7';
    configure({ reactStrictMode: true });
    try {
      renderWithProviders(<ResearchNoteDetailView />, {
        authContext: createAuthenticatedContext(),
      });
    } finally {
      configure({ reactStrictMode: false });
    }
    await waitFor(() => expect(mocks.getNoteById).toHaveBeenCalledTimes(2));

    await act(async () => {
      latestRequest.resolve(latestNote);
      await latestRequest.promise;
    });
    expect(await screen.findByDisplayValue('最新笔记')).toBeEnabled();

    await act(async () => {
      staleRequest.reject(new Error('旧请求失败'));
      await staleRequest.promise.catch(() => undefined);
    });

    await waitFor(() => {
      expect(screen.queryByText('旧请求失败')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '标题' })).toHaveValue('最新笔记');
      expect(screen.getByRole('textbox', { name: '标题' })).toBeEnabled();
      expect(screen.getByRole('button', { name: '保存（⌘S）' })).toBeEnabled();
      expect(mocks.updateNote).not.toHaveBeenCalled();
    });
  });

  it('新建笔记仍可编辑并首次保存', () => {
    renderDetail('new');

    expect(screen.getByRole('button', { name: '保存（⌘S）' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '二级标题' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: '标题' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
    expect(mocks.getNoteById).not.toHaveBeenCalled();
  });

  it('只读态向编辑器工具栏和正文输入框透传禁用状态', () => {
    renderWithProviders(<ResearchNoteEditor content="" onChange={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: '二级标题' })).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('同页切换 noteId 时隔离旧笔记状态，失败目标不会写回旧 ID', async () => {
    mocks.getNoteById
      .mockResolvedValueOnce({
        id: 1,
        tsCode: null,
        title: '旧笔记',
        content: '旧内容',
        tags: [],
        isPinned: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      })
      .mockRejectedValueOnce(new Error('目标笔记不存在'));

    const { user } = renderWithProviders(<ResearchNoteRouteHarness />, {
      authContext: createAuthenticatedContext(),
    });
    expect(await screen.findByDisplayValue('旧笔记')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '切换笔记' }));

    expect(await screen.findByText('目标笔记不存在')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存（⌘S）' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '标题' })).toHaveValue('');
    await waitFor(() => expect(mocks.updateNote).not.toHaveBeenCalled());
  });
});
