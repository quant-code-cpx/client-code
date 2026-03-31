// ----------------------------------------------------------------------
// 选股器模块公共类型
// ----------------------------------------------------------------------

/** 表头列描述 */
export type HeadCell = {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  minWidth?: number;
  /** 是否支持排序，默认 false */
  sortable?: boolean;
  /** 是否固定在左侧（横向滚动时不移动） */
  sticky?: boolean;
  /** 是否默认显示（false = 条件触发） */
  defaultVisible?: boolean;
};
