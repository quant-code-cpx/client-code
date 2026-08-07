const LEGACY_TOOL_TITLES: Readonly<Record<string, string>> = {
  resolve_security: '研究标的确认',
  get_stock_price_history: '个股历史行情',
  get_stock_overview: '个股基础数据',
  get_data_availability: '数据覆盖与可用性',
  get_financial_statements: '财务报表',
  get_financial_indicators: '财务指标',
  get_stock_moneyflow: '个股资金流向',
  compute_valuation_percentile: '估值历史分位',
  screen_stocks: '条件选股结果',
  get_stock_technical_indicators: '技术指标计算',
  get_stock_technical_signals: '技术信号计算',
  get_stock_chip_profile: '筹码结构分析',
  get_stock_margin_history: '融资融券数据',
  get_stock_relative_strength: '相对强弱计算',
  get_stock_events: '公司事件',
  get_stock_shareholder_profile: '股东与质押数据',
  get_market_snapshot: '市场快照',
  get_sector_membership: '行业归属与成分',
  get_index_market_data: '指数行情与估值',
  get_fund_research: '基金研究数据',
  get_industry_rotation: '行业轮动数据',
  get_factor_analysis: '因子分析结果',
  get_macro_snapshot: '宏观经济数据',
  get_option_market: '期权市场数据',
  get_convertible_bond_market: '可转债市场数据',
  run_event_study: '事件研究结果',
  search_web: '公开网页检索结果',
  fetch_web_page: '公开网页正文',
  get_user_watchlist: '自选股数据',
  get_portfolio_risk: '组合风险分析',
  get_backtest_result: '回测结果',
  get_backtest_analytics: '回测深度分析',
  get_portfolio_analytics: '组合绩效分析',
  compute_performance_metrics: '收益与风险指标',
  save_research_report: '研究报告保存预览',
};

const SOURCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  DATABASE: '内部市场数据库',
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

export function toolDisplayLabel(toolName: string): string {
  return LEGACY_TOOL_TITLES[toolName] ?? toolName.replace(/_/g, ' ');
}

export function citationDisplayTitle(title: string): string {
  return LEGACY_TOOL_TITLES[title] ?? title;
}

export function sourceTypeLabel(sourceType?: string): string {
  if (!sourceType) return '研究数据来源';
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
