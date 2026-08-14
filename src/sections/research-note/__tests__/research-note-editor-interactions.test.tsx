import { useState } from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ResearchNoteEditor } from '../research-note-editor';
import { ResearchNoteTagInput } from '../research-note-tag-input';

function setNarrowViewport(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => setNarrowViewport(false));

function EditorHarness({ initial = 'alpha beta' }: { initial?: string }) {
  const [content, setContent] = useState(initial);
  return <ResearchNoteEditor content={content} onChange={setContent} />;
}

function TagHarness() {
  const [tags, setTags] = useState(['回归']);
  return <ResearchNoteTagInput tags={tags} onChange={setTags} />;
}

describe('ResearchNoteEditor 编辑交互', () => {
  it('工具栏按选区包裹、行首加前缀并在光标处插入模板', async () => {
    renderWithProviders(<EditorHarness />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    textarea.setSelectionRange(6, 10);
    fireEvent.click(screen.getByRole('button', { name: '加粗' }));
    await waitFor(() => expect(textarea).toHaveValue('alpha **beta**'));

    textarea.setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole('button', { name: '二级标题' }));
    await waitFor(() => expect(textarea).toHaveValue('## alpha **beta**'));

    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
    fireEvent.click(screen.getByRole('button', { name: '表格' }));
    await waitFor(() =>
      expect(textarea.value).toContain('| 列 1 | 列 2 |')
    );
  });

  it('键盘快捷键仅包裹选中文本，图片粘贴阻止默认行为并触发占位回调', async () => {
    const onChange = vi.fn();
    const onImagePaste = vi.fn();
    renderWithProviders(
      <ResearchNoteEditor
        content="alpha beta"
        onChange={onChange}
        onImagePaste={onImagePaste}
      />
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 5);

    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
    expect(onChange).toHaveBeenCalledWith('[alpha](url) beta');

    const pasteAccepted = fireEvent.paste(textarea, {
      clipboardData: { items: [{ type: 'text/plain' }, { type: 'image/png' }] },
    });
    expect(pasteAccepted).toBe(false);
    expect(onImagePaste).toHaveBeenCalledTimes(1);
  });

  it('只读态同时禁用工具栏、快捷键与图片粘贴', () => {
    const onChange = vi.fn();
    const onImagePaste = vi.fn();
    renderWithProviders(
      <ResearchNoteEditor
        content="readonly"
        onChange={onChange}
        onImagePaste={onImagePaste}
        disabled
      />
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    fireEvent.keyDown(textarea, { key: 'b', metaKey: true });
    fireEvent.paste(textarea, { clipboardData: { items: [{ type: 'image/png' }] } });
    fireEvent.click(screen.getByRole('button', { name: '加粗' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onImagePaste).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '加粗' })).toBeDisabled();
  });

  it('窄屏分页仅展示当前编辑/预览面板', async () => {
    setNarrowViewport(true);
    const { user } = renderWithProviders(<EditorHarness initial="**预览内容**" />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '预览' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('预览内容')).toBeInTheDocument();
  });
});

describe('ResearchNoteTagInput', () => {
  it('回车去除空白后添加、忽略重复标签，并可删除已有标签', async () => {
    const { user } = renderWithProviders(<TagHarness />);
    const input = screen.getByPlaceholderText('输入标签后按回车添加');

    await user.type(input, '  风险  {Enter}');
    expect(screen.getByText('风险')).toBeInTheDocument();
    expect(input).toHaveValue('');

    await user.type(input, '风险{Enter}');
    expect(screen.getAllByText('风险')).toHaveLength(1);

    const deleteIcon = screen.getByText('回归').parentElement?.querySelector('svg');
    expect(deleteIcon).not.toBeNull();
    await user.click(deleteIcon!);
    expect(screen.queryByText('回归')).not.toBeInTheDocument();
  });
});
