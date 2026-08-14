import { parseKnowledgeArticle } from '../parse-knowledge-article';

describe('parseKnowledgeArticle', () => {
  it('拆分导语和带稳定锚点的知识点，并移除锚点标记', () => {
    const result = parseKnowledgeArticle(`导语正文

## 稀缺 {#scarcity}

资源相对于目标有限。

## 选择 {#choice}

在约束下比较方案。`);

    expect(result.intro).toBe('导语正文');
    expect(result.points).toEqual([
      { id: 'scarcity', title: '稀缺', markdown: '资源相对于目标有限。' },
      { id: 'choice', title: '选择', markdown: '在约束下比较方案。' },
    ]);
  });

  it.each([
    ['', '知识页面正文不能为空'],
    ['导语\n\n## 标题\n\n正文', '知识点标题缺少合法锚点'],
    ['导语\n\n## 稀缺 {#same}\n\n正文\n\n## 选择 {#same}\n\n正文', '知识点锚点重复'],
    ['导语\n\n## 稀缺 {#scarcity}', '正文不能为空'],
  ])('拒绝不完整或不稳定的 Markdown 结构', (markdown, expectedMessage) => {
    expect(() => parseKnowledgeArticle(markdown)).toThrow(expectedMessage);
  });
});
