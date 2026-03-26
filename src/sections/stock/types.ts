// ----------------------------------------------------------------------
// stock 模块公共类型
// ----------------------------------------------------------------------

/** 筛选条件 */
export type StockFilters = {
  keyword: string;
  exchange: string;
  market: string;
  industry: string;
  area: string;
};

/** 表头列描述 */
export type HeadCell = {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  minWidth?: number;
  /** 是否支持排序（对应后端 StockSortBy 枚举，默认 false） */
  sortable?: boolean;
  /** 是否固定在左侧（横向滚动时不移动） */
  sticky?: boolean;
};
