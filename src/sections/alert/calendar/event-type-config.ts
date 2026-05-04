import type { EventType } from 'src/api/alert';
import type { IconifyName } from 'src/components/iconify';

// 单一来源：事件类型配置
export type EventTypeConfig = {
  value: EventType;
  label: string;
  /** MUI palette 主键 */
  color: 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error';
  /** theme.palette[color].main 之外的备用 hex（仅在自定义视图渲染色块时用） */
  paletteKey: 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error';
  icon: IconifyName;
  /** 用于排序展示 */
  order: number;
};

export const EVENT_TYPE_LIST: EventTypeConfig[] = [
  {
    value: 'DISCLOSURE',
    label: '财报披露',
    color: 'primary',
    paletteKey: 'primary',
    icon: 'solar:document-text-bold',
    order: 1,
  },
  {
    value: 'FORECAST',
    label: '业绩预告',
    color: 'info',
    paletteKey: 'info',
    icon: 'solar:chart-bold',
    order: 2,
  },
  {
    value: 'DIVIDEND',
    label: '除权除息',
    color: 'success',
    paletteKey: 'success',
    icon: 'solar:wallet-bold',
    order: 3,
  },
  {
    value: 'FLOAT',
    label: '限售解禁',
    color: 'warning',
    paletteKey: 'warning',
    icon: 'solar:lock-bold',
    order: 4,
  },
  {
    value: 'IPO',
    label: '新股发行',
    color: 'secondary',
    paletteKey: 'secondary',
    icon: 'solar:graph-up-bold',
    order: 5,
  },
  {
    value: 'CONVERTIBLE',
    label: '可转债',
    color: 'secondary',
    paletteKey: 'secondary',
    icon: 'solar:shuffle-bold',
    order: 6,
  },
  {
    value: 'SHAREHOLDER',
    label: '股东增减持',
    color: 'error',
    paletteKey: 'error',
    icon: 'solar:users-group-rounded-bold',
    order: 7,
  },
];

export const EVENT_TYPE_MAP: Record<EventType, EventTypeConfig> = EVENT_TYPE_LIST.reduce(
  (acc, item) => ({ ...acc, [item.value]: item }),
  {} as Record<EventType, EventTypeConfig>
);

export function getEventTypeConfig(type: EventType): EventTypeConfig {
  return EVENT_TYPE_MAP[type] ?? EVENT_TYPE_LIST[0];
}
