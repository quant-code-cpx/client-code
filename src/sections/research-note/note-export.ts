import type { ResearchNote } from 'src/api/research-note';

// ----------------------------------------------------------------------

function sanitizeFileName(input: string): string {
  // 移除路径与控制字符；空文件名兜底
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'untitled';
}

function buildMarkdown(note: ResearchNote): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`title: ${JSON.stringify(note.title)}`);
  if (note.tsCode) lines.push(`tsCode: ${note.tsCode}`);
  if (note.tags.length > 0)
    lines.push(`tags: [${note.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
  lines.push(`createdAt: ${note.createdAt}`);
  lines.push(`updatedAt: ${note.updatedAt}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${note.title}`);
  lines.push('');
  lines.push(note.content);
  return lines.join('\n');
}

export function downloadNoteAsMarkdown(note: ResearchNote): void {
  const md = buildMarkdown(note);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(note.title)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// 简单字数统计：中文字 + 英文单词
export function countWords(content: string): number {
  if (!content) return 0;
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const englishWords = (content.match(/[a-zA-Z0-9]+/g) ?? []).length;
  return chineseChars + englishWords;
}

// 阅读时长（分钟，向上取整，最少 1）
export function estimateReadingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 300));
}
