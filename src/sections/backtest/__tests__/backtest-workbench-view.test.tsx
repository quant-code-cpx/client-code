/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { StrategyTemplate, ValidateBacktestRunResponse } from 'src/api/backtest';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { createRun, getStrategyTemplates } from 'src/api/backtest';

import { BacktestWorkbenchView } from '../view/backtest-workbench-view';

const routerPush = vi.hoisted(() => vi.fn());
const resetValidation = vi.hoisted(() => vi.fn());
const validateNow = vi.hoisted(() => vi.fn());
const autoValidateState = vi.hoisted(() => ({
  validation: null as ValidateBacktestRunResponse | null,
  validating: false,
  validationStale: false,
}));

vi.mock('src/api/backtest', () => ({
  createRun: vi.fn(),
  getStrategyTemplates: vi.fn(),
}));
vi.mock('src/auth', () => ({ useAuth: () => ({ userProfile: { id: 7 } }) }));
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/sections/backtest/hooks/use-auto-validate', () => ({
  useAutoValidate: () => ({
    ...autoValidateState,
    validateNow,
    resetValidation,
    setValidation: vi.fn(),
  }),
}));
vi.mock('src/sections/backtest/backtest-config-form', () => ({
  BacktestConfigForm: () => <div>基础配置</div>,
}));
vi.mock('src/sections/backtest/backtest-strategy-config-panel', () => ({
  BacktestStrategyConfigPanel: () => <div>策略参数</div>,
}));
vi.mock('src/sections/backtest/backtest-template-cards', () => ({
  BacktestTemplateCards: ({
    templates,
    onSelect,
  }: {
    templates: StrategyTemplate[];
    onSelect: (id: string) => void;
  }) => (
    <div>
      {templates.map((item) => (
        <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
          {item.name}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('src/sections/backtest/backtest-validate-panel', () => ({
  BacktestValidatePanel: () => <div>校验结果</div>,
}));
vi.mock('src/sections/backtest/backtest-submit-summary', () => ({
  BacktestSubmitSummary: ({
    onValidate,
    onSubmit,
    submitting,
  }: {
    onValidate: () => void;
    onSubmit: () => void;
    submitting: boolean;
  }) => (
    <div>
      <button type="button" onClick={onValidate}>立即校验</button>
      <button type="button" onClick={onSubmit} disabled={submitting}>开始回测</button>
    </div>
  ),
}));
vi.mock('src/sections/backtest/backtest-draft-drawer', () => ({
  BacktestDraftDrawer: () => null,
}));
vi.mock('src/sections/backtest/backtest-running-runs-badge', () => ({
  BacktestRunningRunsBadge: ({ onOpenRun }: { onOpenRun: (id: string) => void }) => (
    <button type="button" onClick={() => onOpenRun('run-active')}>运行中任务</button>
  ),
}));
vi.mock('src/sections/backtest/utils/local-auto-saved-draft', () => ({
  readLocalAutoSavedDraft: vi.fn(() => null),
  writeLocalAutoSavedDraft: vi.fn(),
  toLocalAutoSavedDraft: vi.fn(),
}));

describe('BacktestWorkbenchView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autoValidateState.validation = validValidation();
    autoValidateState.validating = false;
    autoValidateState.validationStale = false;
    validateNow.mockResolvedValue(validValidation());
  });

  it('模板加载失败可局部重试，空结果给出明确降级状态', async () => {
    vi.mocked(getStrategyTemplates)
      .mockRejectedValueOnce(new Error('模板接口不可用'))
      .mockResolvedValueOnce({ templates: [] });

    const { user } = renderWithProviders(<BacktestWorkbenchView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('模板接口不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('模板服务暂不可用，请稍后再试。');
    expect(getStrategyTemplates).toHaveBeenCalledTimes(2);
  });

  it('提交已校验配置，展示成功反馈并可进入任务进度', async () => {
    vi.mocked(getStrategyTemplates).mockResolvedValue({ templates: [template()] });
    vi.mocked(createRun).mockResolvedValue({ runId: 'run-1', jobId: 'job-1', status: 'QUEUED' });

    const { user } = renderWithProviders(<BacktestWorkbenchView />);

    expect(await screen.findByRole('button', { name: '轮动策略' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '开始回测' }));

    await waitFor(() => expect(createRun).toHaveBeenCalledTimes(1));
    expect(createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyType: 'SCREENING_ROTATION',
        strategyConfig: expect.objectContaining({ rankBy: 'totalMv', topN: 20 }),
        startDate: expect.stringMatching(/^\d{8}$/),
        endDate: expect.stringMatching(/^\d{8}$/),
        benchmarkTsCode: '000300.SH',
        initialCapital: 1_000_000,
      })
    );
    expect(await screen.findByText('回测任务已提交，你可以继续调整参数。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看进度' }));
    expect(routerPush).toHaveBeenCalledWith('/backtest/runs/run-1');
  });

  it('显式校验失败展示错误；运行中入口保持深链', async () => {
    vi.mocked(getStrategyTemplates).mockResolvedValue({ templates: [template()] });
    validateNow.mockResolvedValueOnce(null);

    const { user } = renderWithProviders(<BacktestWorkbenchView />);

    await screen.findByRole('button', { name: '轮动策略' });
    await user.click(screen.getByRole('button', { name: '立即校验' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('校验请求失败，请检查网络后重试');

    await user.click(screen.getByRole('button', { name: '运行中任务' }));
    expect(routerPush).toHaveBeenCalledWith('/backtest/runs/run-active');
  });
});

function template(): StrategyTemplate {
  return {
    id: 'SCREENING_ROTATION',
    name: '轮动策略',
    description: '测试模板',
    category: 'SCREENING',
    parameterSchema: [],
  };
}

function validValidation(): ValidateBacktestRunResponse {
  return {
    isValid: true,
    warnings: [],
    errors: [],
    dataReadiness: {
      hasDaily: true,
      hasAdjFactor: true,
      hasTradeCal: true,
      hasIndexDaily: true,
      hasStkLimit: true,
      hasSuspendD: true,
      hasIndexWeight: true,
    },
    stats: {
      tradingDays: 720,
      estimatedUniverseSize: 300,
      earliestAvailableDate: '20200101',
      latestAvailableDate: '20260813',
    },
  };
}
