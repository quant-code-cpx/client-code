import { useLocation } from 'react-router';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AnalysisPatternTab } from '../analysis-pattern-tab';

const apiMocks = vi.hoisted(() => ({
  searchBySeries: vi.fn(),
  searchPatterns: vi.fn(),
  getPatternTemplatesRaw: vi.fn(),
}));

vi.mock('src/api/pattern', () => apiMocks);
vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label, onChange }: { label: string; onChange: (value: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({ format: () => (label === '开始日期' ? '2026-07-01' : '2026-07-31') })
      }
    >
      设置{label}
    </button>
  ),
}));
vi.mock('src/sections/pattern/components', () => ({
  DEFAULT_PATTERN_FILTERS: {
    algorithm: 'DTW',
    topK: 10,
    scope: 'ALL',
    indexCode: '000300.SH',
    lookbackYears: 5,
    excludeSelf: true,
  },
  enrichPatternTemplate: (raw: { id: string; name: string; description: string; length: number }) => ({
    ...raw,
    type: 'reversal_bottom',
    expectedSignal: 'bullish',
    series: [0, 0.4, 1],
  }),
  PatternTemplateGallery: ({
    templates,
    loading,
    onSelect,
  }: {
    templates: Array<{ id: string; name: string }>;
    loading: boolean;
    onSelect: (id: string) => void;
  }) => (
    <div>
      {loading ? '模板加载中' : null}
      {templates.map((template) => (
        <button key={template.id} type="button" onClick={() => onSelect(template.id)}>
          {template.name}
        </button>
      ))}
    </div>
  ),
  PatternAdvancedFilters: ({
    value,
    onChange,
  }: {
    value: Record<string, unknown>;
    onChange: (value: Record<string, unknown>) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          ...value,
          algorithm: 'NED',
          topK: 5,
          scope: 'INDEX',
          indexCode: '000300.SH',
          lookbackYears: 3,
        })
      }
    >
      应用指数范围参数
    </button>
  ),
  PatternResultsList: ({
    loading,
    error,
    result,
  }: {
    loading: boolean;
    error: string;
    result: { candidateCount: number } | null;
  }) => <div>{loading ? '结果搜索中' : error || (result ? `候选 ${result.candidateCount}` : '尚未搜索')}</div>,
}));

const templateRaw = {
  id: 'double-bottom',
  name: '双底',
  description: '反转形态',
  length: 3,
};
const searchResult = {
  patternLength: 3,
  algorithm: 'DTW',
  candidateCount: 88,
  elapsedMs: 10,
  querySeries: [0, 0.4, 1],
  matches: [],
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

describe('AnalysisPatternTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getPatternTemplatesRaw.mockResolvedValue([templateRaw]);
    apiMocks.searchBySeries.mockResolvedValue(searchResult);
    apiMocks.searchPatterns.mockResolvedValue(searchResult);
  });

  it('模板搜索使用补全后的序列与高级参数，并传递取消信号', async () => {
    const { user } = renderWithProviders(<AnalysisPatternTab tsCode="600519.SH" />);

    await user.click(await screen.findByRole('button', { name: '双底' }));
    await user.click(screen.getByRole('button', { name: '应用指数范围参数' }));
    await user.click(screen.getByRole('button', { name: '搜索' }));

    await waitFor(() => expect(apiMocks.searchBySeries).toHaveBeenCalledOnce());
    expect(apiMocks.searchBySeries).toHaveBeenCalledWith(
      {
        series: [0, 0.4, 1],
        algorithm: 'NED',
        topK: 5,
        scope: 'INDEX',
        indexCode: '000300.SH',
        lookbackYears: 3,
      },
      expect.any(AbortSignal)
    );
    expect(await screen.findByText('候选 88')).toBeInTheDocument();
  });

  it('区间搜索把展示日期转成 YYYYMMDD，并显式携带股票与 excludeSelf', async () => {
    const { user } = renderWithProviders(<AnalysisPatternTab tsCode="600519.SH" />);

    await user.click(screen.getByRole('button', { name: '按区间搜索' }));
    await user.click(screen.getByRole('button', { name: '设置开始日期' }));
    await user.click(screen.getByRole('button', { name: '设置结束日期' }));
    await user.click(screen.getByRole('switch', { name: '排除当前股票自身' }));
    await user.click(screen.getByRole('button', { name: '搜索' }));

    await waitFor(() => expect(apiMocks.searchPatterns).toHaveBeenCalledOnce());
    expect(apiMocks.searchPatterns).toHaveBeenCalledWith(
      {
        tsCode: '600519.SH',
        startDate: '20260701',
        endDate: '20260731',
        algorithm: 'DTW',
        topK: 10,
        scope: 'ALL',
        indexCode: undefined,
        lookbackYears: 5,
        excludeSelf: true,
      },
      expect.any(AbortSignal)
    );
  });

  it('模板加载失败可重试；搜索失败保持可恢复错误', async () => {
    apiMocks.getPatternTemplatesRaw
      .mockRejectedValueOnce(new Error('模板服务不可用'))
      .mockResolvedValueOnce([templateRaw]);
    apiMocks.searchBySeries.mockRejectedValueOnce(new Error('搜索服务不可用'));
    const { user } = renderWithProviders(<AnalysisPatternTab tsCode="600519.SH" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('模板服务不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));
    await user.click(await screen.findByRole('button', { name: '双底' }));
    await user.click(screen.getByRole('button', { name: '搜索' }));

    expect(await screen.findByText('搜索服务不可用')).toBeInTheDocument();
    expect(apiMocks.getPatternTemplatesRaw).toHaveBeenCalledTimes(2);
  });

  it('扩大搜索保留模板或个股区间上下文，并在卸载时中止未完成请求', async () => {
    let resolveSearch!: (value: typeof searchResult) => void;
    apiMocks.searchPatterns.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      })
    );
    const { user, unmount } = renderWithProviders(
      <>
        <AnalysisPatternTab tsCode="600519.SH" />
        <LocationProbe />
      </>
    );

    await user.click(screen.getByRole('button', { name: '按区间搜索' }));
    await user.click(screen.getByRole('button', { name: '设置开始日期' }));
    await user.click(screen.getByRole('button', { name: '设置结束日期' }));
    await user.click(screen.getByRole('button', { name: '扩大到全市场搜索' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/pattern?mode=range&tsCode=600519.SH&start=2026-07-01&end=2026-07-31'
    );

    await user.click(screen.getByRole('button', { name: '搜索' }));
    const signal = apiMocks.searchPatterns.mock.calls[0][1] as AbortSignal;
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
    resolveSearch(searchResult);
  });
});
