import type { ParsedKnowledgeArticle } from './types';

const POINT_HEADING = /^##\s+(.+?)\s+\{#([a-z0-9]+(?:-[a-z0-9]+)*)\}\s*$/;

export function parseKnowledgeArticle(markdown: string): ParsedKnowledgeArticle {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();

  if (!normalized) {
    throw new Error('知识页面正文不能为空');
  }

  const lines = normalized.split('\n');
  const introLines: string[] = [];
  const points: ParsedKnowledgeArticle['points'] = [];
  const pointIds = new Set<string>();
  let current: ParsedKnowledgeArticle['points'][number] | null = null;

  for (const line of lines) {
    const heading = line.match(POINT_HEADING);

    if (heading) {
      if (current) {
        current.markdown = current.markdown.trim();
        if (!current.markdown) throw new Error(`知识点“${current.title}”正文不能为空`);
      }

      const [, title, id] = heading;
      if (pointIds.has(id)) throw new Error(`知识点锚点重复：${id}`);
      pointIds.add(id);
      current = { id, title: title.trim(), markdown: '' };
      points.push(current);
      continue;
    }

    if (/^##\s+/.test(line)) {
      throw new Error(`知识点标题缺少合法锚点：${line}`);
    }

    if (current) current.markdown += `${line}\n`;
    else introLines.push(line);
  }

  if (current) {
    current.markdown = current.markdown.trim();
    if (!current.markdown) throw new Error(`知识点“${current.title}”正文不能为空`);
  }

  const intro = introLines.join('\n').trim();
  if (!intro) throw new Error('知识页面导语不能为空');
  if (points.length === 0) throw new Error('知识页面至少需要一个知识点');

  return { intro, points };
}
