import type { CalendarEvent } from 'src/api/alert';

import dayjs from 'dayjs';

import { formatCalendarReturn } from '../event-detail-drawer';
import { createCalendarRows, reconcileCalendarSelection } from '../calendar-table-view';
import {
  DEFAULT_FILTERS,
  mapMarketCapBuckets,
  filtersToQueryParams,
  createCalendarDateRange,
} from '../types';

const baseDate = dayjs('2026-08-08');

function event(id: string, tsCode: string): CalendarEvent {
  return {
    id,
    tsCode,
    date: '20260808',
    stockName: tsCode,
    type: 'DISCLOSURE',
    title: `事件 ${id}`,
    detail: null,
  };
}

describe('事件日历 v3 业务契约', () => {
  it.each([
    [1, '20260808'],
    [7, '20260814'],
    [14, '20260821'],
    [30, '20260906'],
  ] as const)('CAL-B07: %i 日快捷范围含首尾恰好对应自然日数', (days, expectedEnd) => {
    const range = createCalendarDateRange(days, baseDate);

    expect(range).toEqual({ startDate: '20260808', endDate: expectedEnd });
    expect(dayjs(range.endDate).diff(dayjs(range.startDate), 'day') + 1).toBe(days);
  });

  it('CAL-B03: UI 三档映射到服务端四档且保持 100/500 亿边界', () => {
    expect(mapMarketCapBuckets(['SMALL'])).toEqual(['SMALL', 'MID']);
    expect(mapMarketCapBuckets(['MID'])).toEqual(['LARGE']);
    expect(mapMarketCapBuckets(['LARGE'])).toEqual(['MEGA']);
  });

  it('CAL-B12: view 不进入 calendar/list 请求参数', () => {
    const grid = filtersToQueryParams({
      ...DEFAULT_FILTERS,
      startDate: '20260808',
      endDate: '20260821',
      view: 'grid',
    });
    const table = filtersToQueryParams({
      ...DEFAULT_FILTERS,
      startDate: '20260808',
      endDate: '20260821',
      view: 'table',
    });

    expect(table).toEqual(grid);
  });

  it('CAL-B06: history 小数收益转换为百分比并保留 A 股正负色语义所需符号', () => {
    expect(formatCalendarReturn(0.0123)).toBe('+1.23%');
    expect(formatCalendarReturn(-0.0045)).toBe('-0.45%');
    expect(formatCalendarReturn(null)).toBe('—');
  });

  it('CAL-B09: 新结果集合会剔除幽灵选择', () => {
    const oldA = event('a', '000001.SZ');
    const oldB = event('b', '000002.SZ');
    const selected = new Set(['a', 'b']);

    expect([...reconcileCalendarSelection(selected, [oldB])]).toEqual(['b']);
    expect([...reconcileCalendarSelection(selected, [oldA, oldB])]).toEqual(['a', 'b']);
  });

  it('CAL-B09: 内容相同的真实事件仍有独立稳定行 key', () => {
    const duplicate = event('', '000001.SZ');
    delete duplicate.id;

    expect(createCalendarRows([duplicate, duplicate]).map((row) => row.key)).toEqual([
      '000001.SZ-20260808-DISCLOSURE-事件 ',
      '000001.SZ-20260808-DISCLOSURE-事件 #2',
    ]);
  });
});
