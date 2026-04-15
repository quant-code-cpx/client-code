import type { ViolationItem } from 'src/api/portfolio';
import type {
  SyncFailedPayload,
  SyncStartedPayload,
  RiskViolationPayload,
  SyncCompletedPayload,
} from 'src/contexts/sync-notification-context';

// ----------------------------------------------------------------------

export function createSyncStartedPayload(
  overrides?: Partial<SyncStartedPayload>
): SyncStartedPayload {
  return {
    trigger: 'manual',
    mode: 'incremental',
    ...overrides,
  };
}

export function createSyncCompletedPayload(
  overrides?: Partial<SyncCompletedPayload>
): SyncCompletedPayload {
  return {
    trigger: 'manual',
    mode: 'incremental',
    executedTasks: ['daily_basic', 'money_flow'],
    skippedTasks: ['adj_factor'],
    failedTasks: [],
    targetTradeDate: '20260413',
    elapsedSeconds: 12.5,
    ...overrides,
  };
}

export function createSyncFailedPayload(overrides?: Partial<SyncFailedPayload>): SyncFailedPayload {
  return {
    trigger: 'scheduler',
    mode: 'full',
    reason: 'Tushare API 超时',
    ...overrides,
  };
}

export function createRiskViolationPayload(
  overrides?: Partial<RiskViolationPayload>
): RiskViolationPayload {
  return {
    portfolioId: 'portfolio-001',
    portfolioName: '测试组合',
    violations: [
      {
        ruleType: 'MAX_POSITION_RATIO',
        tsCode: '000001.SZ',
        stockName: '平安银行',
        currentValue: 35,
        threshold: 30,
        message: '平安银行持仓占比 35% 超出单只上限 30%',
      } as ViolationItem,
    ],
    checkedAt: '2026-04-13T10:00:00Z',
    ...overrides,
  };
}
