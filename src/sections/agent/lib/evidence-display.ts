import { AGENT_TOOL_DISPLAY_NAMES } from 'src/types/agent/generated';

const SOURCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  DATABASE: '内部市场数据库',
  MARKET_DATA: '公开行情',
  PROGRAM_CALCULATION: '程序计算结果',
  OFFICIAL: '官方资料',
  MEDIA: '媒体报道',
  INSTITUTION: '机构资料',
  MODEL_INFERENCE: '研究结论整合',
  REPORT: '历史研究报告',
};

type CitationSource = {
  citationId: string;
  sourceId?: string;
  sourceType?: string;
  title: string;
  canonicalUrl?: string | null;
  retrievedAt: string;
};

export type CitationSourceGroup<T extends CitationSource> = {
  primary: T;
  citations: T[];
};

function generatedToolDisplayName(toolName: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(AGENT_TOOL_DISPLAY_NAMES, toolName)) return undefined;
  return AGENT_TOOL_DISPLAY_NAMES[toolName as keyof typeof AGENT_TOOL_DISPLAY_NAMES];
}

export function toolDisplayLabel(toolName: string, serverDisplayName?: string | null): string {
  const normalizedServerName = serverDisplayName?.trim();
  return normalizedServerName || generatedToolDisplayName(toolName) || '研究工具';
}

export function citationDisplayTitle(title: string): string {
  return generatedToolDisplayName(title) ?? title;
}

export function sourceTypeLabel(sourceType?: string, title?: string): string {
  if (!sourceType) return '研究数据来源';
  if (sourceType === 'MEDIA' && title && citationDisplayTitle(title) === '个股准实时行情') {
    return '公开行情';
  }
  return SOURCE_TYPE_LABELS[sourceType] ?? '研究数据来源';
}

export function groupCitationSources<T extends CitationSource>(
  citations: readonly T[]
): Array<CitationSourceGroup<T>> {
  const groups = new Map<string, CitationSourceGroup<T>>();

  for (const citation of citations) {
    const key = citation.canonicalUrl
      ? `url:${citation.canonicalUrl}`
      : `source:${citation.sourceType ?? ''}:${citationDisplayTitle(citation.title)}:${citation.retrievedAt}`;
    const group = groups.get(key);
    if (group) group.citations.push(citation);
    else groups.set(key, { primary: citation, citations: [citation] });
  }

  return [...groups.values()];
}
