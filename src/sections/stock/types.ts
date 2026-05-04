// ----------------------------------------------------------------------
// stock 模块公共类型
// ----------------------------------------------------------------------

import type { ALL_COLUMN_IDS } from './constants';

/** 筛选条件 */
export type StockFilters = {
  keyword: string;
  exchange: string;
  market: string;
  /** 行业精确多选 */
  industries: string[];
  /** 地域精确多选 */
  areas: string[];
  /** 沪深港通：N / H / S / '' */
  isHs: string;
  /** 快捷条件开关（流动性/高股息/百亿以上） */
  highLiquidity: boolean;
  highDividend: boolean;
  largeCap: boolean;
};

/** 可配置列 ID */
export type ColumnId = (typeof ALL_COLUMN_IDS)[number];

/** 表头列描述 */
export type HeadCell = {
  id: ColumnId | 'name';
  label: string;
  align?: 'left' | 'right' | 'center';
  minWidth?: number;
  /** 是否支持排序（对应后端 StockSortBy 枚举，默认 false） */
  sortable?: boolean;
  /** 是否固定在左侧（横向滚动时不移动） */
  sticky?: boolean;
};
