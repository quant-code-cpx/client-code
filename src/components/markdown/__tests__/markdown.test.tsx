import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { Markdown } from '../markdown';
import { ResearchNotePreview } from '../../../sections/research-note/research-note-preview';

describe('Markdown', () => {
  it('渲染 GFM 标题、删除线、任务项和表格', () => {
    renderWithProviders(
      <Markdown>{'# 研究结论\n\n~~旧结论~~\n\n- [x] 已核验\n\n| 指标 | 值 |\n| --- | ---: |\n| ROE | 32.5% |'}</Markdown>
    );

    expect(screen.getByRole('heading', { name: '研究结论' })).toBeInTheDocument();
    expect(screen.getByText('旧结论').tagName).toBe('DEL');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('丢弃 raw HTML、危险链接和图片节点', () => {
    renderWithProviders(
      <Markdown>{'<script>alert(1)</script><img src=x onerror=alert(1)>\n\n[执行](javascript:alert(1))\n\n![远程图](https://example.com/x.png)'}</Markdown>
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('执行').closest('a')).toBeNull();
    expect(screen.getByText('[图片已禁用：远程图]')).toBeInTheDocument();
  });

  it('安全外链使用新窗口隔离', () => {
    renderWithProviders(<Markdown>[官方公告](https://example.com/report)</Markdown>);

    const link = screen.getByRole('link', { name: '官方公告' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('流式阶段保持低成本纯文本，不创建 Markdown 表格', () => {
    renderWithProviders(<Markdown streaming>{'| 指标 | 值 |\n| --- | --- |\n| PE | 20 |'}</Markdown>);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/\| 指标 \| 值 \|/)).toBeInTheDocument();
  });

  it('研究笔记复用安全 renderer', () => {
    renderWithProviders(<ResearchNotePreview content={'## 笔记\n\n<img src=x onerror=alert(1)>'} />);

    expect(screen.getByRole('heading', { name: '笔记' })).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});
