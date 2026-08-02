import { mapLimitStatus } from '../stock-limit-status';

describe('mapLimitStatus', () => {
  it.each([
    [0, '平盘'],
    [1, '普通上涨'],
    [4, '普通下跌'],
  ])('%i（%s）不显示涨跌停标签', (value) => {
    expect(mapLimitStatus(value)).toBeNull();
  });

  it.each([
    [2, { label: '涨停', color: 'error' }],
    [3, { label: '一字涨停', color: 'error' }],
    [5, { label: '跌停', color: 'success' }],
    [6, { label: '一字跌停', color: 'success' }],
  ] as const)('%i 显示正确涨跌停标签', (value, expected) => {
    expect(mapLimitStatus(value)).toEqual(expected);
  });

  it.each([null, undefined, -1, 7])('空值或未知状态 %s 不显示标签', (value) => {
    expect(mapLimitStatus(value)).toBeNull();
  });
});
