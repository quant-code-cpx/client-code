import type { HeatmapItem } from 'src/api/heatmap';
import type {
  IndustryDictMappingItem,
  IndustryDictMappingCoverage,
} from 'src/api/industry-dict';

// ── Index structures ────────────────────────────────────────────

export type IndustryMappingIndexes = {
  bySwCode: Map<string, IndustryDictMappingItem>;
  bySwName: Map<string, IndustryDictMappingItem>;
  byDcTsCode: Map<string, IndustryDictMappingItem>;
};

export function buildIndustryMappingIndexes(
  items: IndustryDictMappingItem[]
): IndustryMappingIndexes {
  const bySwCode = new Map<string, IndustryDictMappingItem>();
  const bySwName = new Map<string, IndustryDictMappingItem>();
  const byDcTsCode = new Map<string, IndustryDictMappingItem>();

  for (const item of items) {
    bySwCode.set(item.swCode, item);
    bySwName.set(item.swName, item);
    if (item.dcTsCode) byDcTsCode.set(item.dcTsCode, item);
  }

  return { bySwCode, bySwName, byDcTsCode };
}

// ── Resolve dcTsCode from a heatmap item ────────────────────────

export function resolveDcTsCodeFromHeatmapItem(
  item: Pick<HeatmapItem, 'dcTsCode' | 'swCode' | 'swName' | 'groupName' | 'industry'>,
  indexes: IndustryMappingIndexes | null
): { dcTsCode: string | null; swName: string | null; dcName: string | null } {
  // Priority 1: item自带 dcTsCode
  if (item.dcTsCode) {
    const mapped = indexes?.byDcTsCode.get(item.dcTsCode);
    return {
      dcTsCode: item.dcTsCode,
      swName: mapped?.swName ?? null,
      dcName: mapped?.dcName ?? null,
    };
  }

  // Priority 2: swCode 查字典
  if (item.swCode && indexes) {
    const mapped = indexes.bySwCode.get(item.swCode);
    if (mapped?.dcTsCode) {
      return { dcTsCode: mapped.dcTsCode, swName: mapped.swName, dcName: mapped.dcName };
    }
  }

  // Priority 3: swName / groupName / industry 查字典
  const nameToLookup = item.swName ?? item.groupName ?? item.industry;
  if (nameToLookup && indexes) {
    const mapped = indexes.bySwName.get(nameToLookup);
    if (mapped?.dcTsCode) {
      return { dcTsCode: mapped.dcTsCode, swName: mapped.swName, dcName: mapped.dcName };
    }
  }

  return { dcTsCode: null, swName: null, dcName: null };
}

// ── Format dict status text ─────────────────────────────────────

export function formatIndustryDictStatus(state: {
  coverage: IndustryDictMappingCoverage | null;
  failed: boolean;
}): { tone: 'normal' | 'warning' | 'error'; text: string } {
  if (state.failed) {
    return { tone: 'error', text: '行业字典暂不可用，跨 Tab 跳转将使用降级逻辑' };
  }
  if (!state.coverage) {
    return { tone: 'normal', text: '' };
  }
  if (state.coverage.unmatched === 0) {
    return {
      tone: 'normal',
      text: `行业字典：申万 L1 → 东财行业板块，已匹配 ${state.coverage.matched}/${state.coverage.total}`,
    };
  }
  return {
    tone: 'warning',
    text: `行业字典：部分行业暂未匹配，未匹配 ${state.coverage.unmatched} 个`,
  };
}
