import { act, waitFor, renderHook } from '@testing-library/react';

import { useAnalysisHistory } from '../use-analysis-history';
import { HISTORY_MAX, HISTORY_STORAGE_KEY } from '../constants';
import { useAdvancedAnalysisRun } from '../use-advanced-analysis-run';
import { f4, fPct, parseTsCodes, presetToRange, defaultTradeDate, extractErrorMessage } from '../utils';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('advanced-analysis core utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes dates, numeric labels, errors and deduplicated stock codes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T10:00:00+08:00'));

    expect(defaultTradeDate().format('YYYYMMDD')).toBe('20260807');
    expect(presetToRange('3M').start.format('YYYYMMDD')).toBe('20260507');
    expect(fPct(0.12345)).toBe('12.35%');
    expect(fPct(null)).toBe('--');
    expect(f4(1.23456)).toBe('1.2346');
    expect(f4(undefined)).toBe('--');
    expect(extractErrorMessage(new Error('后端失败'), '兜底')).toBe('后端失败');
    expect(extractErrorMessage('网络失败', '兜底')).toBe('网络失败');
    expect(extractErrorMessage({}, '兜底')).toBe('兜底');
    expect(parseTsCodes('600000.sh, 000001.SZ；600000.SH bad')).toEqual({
      valid: ['600000.SH', '000001.SZ'],
      invalid: ['bad'],
    });
  });
});

describe('useAdvancedAnalysisRun', () => {
  it('tracks success, backend errors, reset and ignores an obsolete response', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const fn = vi
      .fn<(request: string) => Promise<string>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useAdvancedAnalysisRun(fn, '分析失败'));

    let firstRun!: Promise<string | null>;
    let secondRun!: Promise<string | null>;
    act(() => {
      firstRun = result.current.run('first');
      secondRun = result.current.run('second');
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.lastRequest).toBe('second');

    await act(async () => first.resolve('old'));
    expect(await firstRun).toBeNull();
    await act(async () => second.resolve('latest'));
    expect(await secondRun).toBe('latest');
    expect(result.current.data).toBe('latest');
    expect(result.current.loading).toBe(false);
    expect(result.current.lastRunAt).not.toBeNull();

    const failed = deferred<string>();
    fn.mockReturnValueOnce(failed.promise);
    let failedRun!: Promise<string | null>;
    act(() => {
      failedRun = result.current.run('failed');
    });
    await act(async () => failed.reject(new Error('数据不可用')));
    expect(await failedRun).toBeNull();
    expect(result.current.error).toBe('数据不可用');
    expect(result.current.data).toBeNull();

    act(() => result.current.reset());
    expect(result.current).toEqual(
      expect.objectContaining({
        data: null,
        loading: false,
        error: '',
        lastRequest: null,
        lastRunAt: null,
        elapsedMs: null,
      })
    );
  });
});

describe('useAnalysisHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads valid storage, persists a bounded history, then removes and clears entries', async () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'stored',
          type: 'orthogonalize',
          request: {},
          summary: '历史结果',
          status: 'success',
          elapsedMs: 10,
          createdAt: 1,
        },
        null,
      ])
    );
    const { result } = renderHook(() => useAnalysisHistory());
    await waitFor(() => expect(result.current.items.map((item) => item.id)).toEqual(['stored']));

    act(() => {
      for (let index = 0; index < HISTORY_MAX + 2; index += 1) {
        result.current.add({
          type: 'fama-macbeth',
          request: { index },
          summary: `运行 ${index}`,
          status: 'success',
          elapsedMs: index,
        });
      }
    });
    expect(result.current.items).toHaveLength(HISTORY_MAX);
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]')).toHaveLength(HISTORY_MAX);

    const removedId = result.current.items[0].id;
    act(() => result.current.remove(removedId));
    expect(result.current.items.some((item) => item.id === removedId)).toBe(false);

    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBe('[]');
  });

  it('recovers from malformed storage', async () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '{bad-json');
    const { result } = renderHook(() => useAnalysisHistory());
    await waitFor(() => expect(result.current.items).toEqual([]));
  });
});
