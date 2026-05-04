import { it, expect, describe } from 'vitest';

import {
  toRunListQuery,
  parseRunListState,
  isInvalidDateRange,
  serializeRunListState,
  countActiveRunFilters,
} from '../use-backtest-run-list-state';

// ----------------------------------------------------------------------

describe('backtest run list URL state', () => {
  it('keeps default URL clean so shared links stay readable', () => {
    const state = parseRunListState(new URLSearchParams(''));
    const params = serializeRunListState(state);

    expect(params.toString()).toBe('');
    expect(toRunListQuery(state)).toEqual({ page: 1, pageSize: 20, archived: false });
  });

  it('serializes business filters to backend body fields without query-string-only state', () => {
    const state = parseRunListState(
      new URLSearchParams(
        'status=FAILED&strategyType=FACTOR_RANKING&keyword=alpha&start=2026-04-01&end=2026-05-01&archived=all&tagIds=t1,t2&page=3&pageSize=50&sort=sharpeRatio&order=asc'
      )
    );

    expect(toRunListQuery(state)).toEqual({
      page: 3,
      pageSize: 50,
      status: 'FAILED',
      strategyType: 'FACTOR_RANKING',
      keyword: 'alpha',
      createdStart: '2026-04-01',
      createdEnd: '2026-05-01',
      archived: undefined,
      tagIds: ['t1', 't2'],
      sort: 'sharpeRatio',
      order: 'asc',
    });
  });

  it('detects invalid date ranges before the list request is sent', () => {
    const state = parseRunListState(new URLSearchParams('start=2026-05-02&end=2026-04-30'));

    expect(isInvalidDateRange(state.filter)).toBe(true);
  });

  it('counts active filters from the user visible controls', () => {
    const state = parseRunListState(
      new URLSearchParams('status=RUNNING&keyword=ma&archived=archived&tagIds=t1')
    );

    expect(countActiveRunFilters(state.filter)).toBe(4);
  });
});
