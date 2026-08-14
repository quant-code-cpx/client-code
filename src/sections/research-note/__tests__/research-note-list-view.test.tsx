import type { ResearchNote } from 'src/api/research-note';

import { act, screen, within, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { listNotes, getUserTags } from 'src/api/research-note';

import { ResearchNoteListView } from '../view/research-note-list-view';

const push = vi.hoisted(() => vi.fn());

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push }) }));

vi.mock('src/api/research-note', () => ({
  listNotes: vi.fn(),
  getUserTags: vi.fn(),
}));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const note: ResearchNote = {
  id: 7,
  tsCode: '000001.SZ',
  title: '银行事件复盘',
  content: '# 市场观察\n[政策链接](https://example.com) **影响有限**',
  tags: ['银行', '事件', '政策', '复盘'],
  isPinned: true,
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-12T08:00:00.000Z',
};

function emptyResult() {
  return { notes: [], total: 0, page: 1, pageSize: 12 };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.mocked(getUserTags).mockResolvedValue({ tags: ['银行', '事件'] });
  vi.mocked(listNotes).mockResolvedValue(emptyResult());
});

describe('ResearchNoteListView', () => {
  it('从 URL 恢复完整筛选 Body，并渲染卡片内容与分页', async () => {
    vi.mocked(listNotes).mockResolvedValue({ notes: [note], total: 25, page: 2, pageSize: 12 });

    renderWithProviders(<ResearchNoteListView />, {
      initialEntries: [
        '/research/notes?keyword=alpha&tags=银行,AI&sortBy=createdAt&dateRange=7d&pinned=1&hasStock=1&page=2',
      ],
    });

    await waitFor(() =>
      expect(listNotes).toHaveBeenCalledWith({
        page: 2,
        pageSize: 12,
        tags: ['银行', 'AI'],
        tsCode: undefined,
        keyword: 'alpha',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        dateRange: '7d',
        pinnedOnly: true,
        hasStock: true,
      })
    );

    expect(await screen.findByText('银行事件复盘')).toBeInTheDocument();
    expect(screen.getByText(/市场观察.*政策链接.*影响有限/)).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('区分 loading、empty 与 error，并可从错误直接重试', async () => {
    let resolveRequest!: (value: ReturnType<typeof emptyResult>) => void;
    vi.mocked(listNotes).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const first = renderWithProviders(<ResearchNoteListView />);

    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6);
    expect(screen.queryByText('还没有研究笔记')).not.toBeInTheDocument();

    await act(async () => resolveRequest(emptyResult()));
    expect(await screen.findByText('还没有研究笔记')).toBeInTheDocument();
    first.unmount();

    vi.mocked(listNotes).mockReset();
    vi.mocked(listNotes)
      .mockRejectedValueOnce(new Error('笔记服务暂不可用'))
      .mockResolvedValueOnce(emptyResult());
    const { user } = renderWithProviders(<ResearchNoteListView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('笔记服务暂不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));

    await waitFor(() => expect(listNotes).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('还没有研究笔记')).toBeInTheDocument();
    expect(screen.queryByText('笔记服务暂不可用')).not.toBeInTheDocument();
  });

  it('分页与快捷筛选重置到正确页码并重新请求', async () => {
    vi.mocked(listNotes).mockResolvedValue({ notes: [note], total: 25, page: 1, pageSize: 12 });
    const { user } = renderWithProviders(<ResearchNoteListView />);

    expect(await screen.findByText('银行事件复盘')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(listNotes).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    await user.click(screen.getByText('今天'));
    await waitFor(() =>
      expect(listNotes).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, dateRange: 'today' })
      )
    );
  });

  it('记忆表格视图，并支持鼠标和键盘语义打开笔记', async () => {
    window.localStorage.setItem('research-note-view-mode', 'table');
    vi.mocked(listNotes).mockResolvedValue({ notes: [note], total: 1, page: 1, pageSize: 12 });
    const { user } = renderWithProviders(<ResearchNoteListView />);

    const row = await screen.findByRole('link', { name: '打开研究笔记 银行事件复盘' });
    expect(within(row).getByText('000001.SZ')).toBeInTheDocument();
    row.focus();
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenLastCalledWith('/research/notes/7');
    await user.click(row);
    expect(push).toHaveBeenLastCalledWith('/research/notes/7');

    await user.click(screen.getByRole('button', { name: '卡片视图' }));
    expect(window.localStorage.getItem('research-note-view-mode')).toBe('card');
    expect(await screen.findByRole('link', { name: /银行事件复盘/ })).toHaveAttribute(
      'href',
      '/research/notes/7'
    );
  });

  it('新建菜单区分空白与模板路由', async () => {
    const { user } = renderWithProviders(<ResearchNoteListView />);
    await screen.findByText('还没有研究笔记');

    await user.click(screen.getByRole('button', { name: /新建笔记/ }));
    await user.click(screen.getByRole('menuitem', { name: /事件研究/ }));
    expect(push).toHaveBeenLastCalledWith('/research/notes/new?template=event');

    await user.click(screen.getByRole('button', { name: /新建笔记/ }));
    await user.click(screen.getByRole('menuitem', { name: /空白笔记/ }));
    expect(push).toHaveBeenLastCalledWith('/research/notes/new');
  });

  it('兼容 v2 标签对象并把标签提供给筛选器', async () => {
    vi.mocked(getUserTags).mockResolvedValue({
      tags: [{ tag: '宏观', count: 3 }, { tag: '政策', count: 2 }] as unknown as string[],
    });
    const { user } = renderWithProviders(<ResearchNoteListView />);
    await screen.findByText('还没有研究笔记');

    await user.click(screen.getByPlaceholderText('标签筛选'));
    expect(await screen.findByRole('option', { name: '宏观' })).toBeInTheDocument();
  });
});
