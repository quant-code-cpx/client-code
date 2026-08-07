import type { components } from 'src/api/generated/news-api';

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { act, waitFor, renderHook } from '@testing-library/react';

type NewsCoverage = components['schemas']['NewsCoverageResponseDto'];

type UseNewsCoverageResult = {
  coverage: NewsCoverage | null;
  status: 'loading' | 'ready' | 'error';
  error: unknown | null;
  refresh: () => void;
};

type UseNewsCoverageModule = {
  useNewsCoverage?: () => UseNewsCoverageResult;
};

const mocks = vi.hoisted(() => ({
  getCoverage: vi.fn(),
}));

vi.mock('src/api/news', () => ({
  newsApi: {
    getCoverage: mocks.getCoverage,
  },
}));

const targetFile = resolve(process.cwd(), 'src/sections/news/hooks/use-news-coverage.ts');
const targetExists = existsSync(targetFile);
let loadedModule: UseNewsCoverageModule | undefined;

const coverage: NewsCoverage = {
  generatedAt: '2026-08-06T00:00:00.000Z',
  overallStatus: 'READY',
  dataThrough: '2026-08-05T23:59:00.000Z',
  partial: false,
  warnings: [],
  feeds: [],
};

beforeAll(async () => {
  if (!targetExists) return;
  loadedModule = await vi.importActual<UseNewsCoverageModule>('../hooks/use-news-coverage');
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('coverage hook RED 门禁', () => {
  it('NEWS-FE-COVERAGE-RED-002：提供独立 useNewsCoverage seam', () => {
    expect(targetExists, '缺少独立 coverage 请求 hook').toBe(true);
  });
});

describe.runIf(targetExists)('useNewsCoverage 独立状态契约', () => {
  function renderCoverage() {
    if (!loadedModule?.useNewsCoverage) throw new Error('必须导出 useNewsCoverage');
    return renderHook(() => loadedModule!.useNewsCoverage!());
  }

  it('成功读取 coverage，并透传 AbortSignal', async () => {
    mocks.getCoverage.mockResolvedValueOnce(coverage);
    const hook = renderCoverage();

    expect(hook.result.current.status).toBe('loading');
    expect(mocks.getCoverage).toHaveBeenCalledWith({}, expect.any(AbortSignal));
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.coverage).toEqual(coverage);
  });

  it('失败只进入 coverage error，不伪造状态', async () => {
    const error = new Error('coverage unavailable');
    mocks.getCoverage.mockRejectedValueOnce(error);
    const hook = renderCoverage();

    await waitFor(() => expect(hook.result.current.status).toBe('error'));
    expect(hook.result.current.coverage).toBeNull();
    expect(hook.result.current.error).toBe(error);
  });

  it('refresh 中止旧请求并重新读取', async () => {
    mocks.getCoverage.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce(coverage);
    const hook = renderCoverage();
    const firstSignal = mocks.getCoverage.mock.calls[0][1] as AbortSignal;

    act(() => hook.result.current.refresh());

    await waitFor(() => expect(mocks.getCoverage).toHaveBeenCalledTimes(2));
    expect(firstSignal.aborted).toBe(true);
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  });

  it('卸载时中止请求', () => {
    mocks.getCoverage.mockReturnValueOnce(new Promise(() => {}));
    const hook = renderCoverage();
    const signal = mocks.getCoverage.mock.calls[0][1] as AbortSignal;

    hook.unmount();

    expect(signal.aborted).toBe(true);
  });
});
