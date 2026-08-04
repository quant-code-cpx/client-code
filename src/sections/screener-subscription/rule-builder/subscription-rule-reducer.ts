import type { ScreenerFilters } from 'src/api/screener';
import type {
  UniverseSpec,
  SubscriptionStatus,
  FactorConditionSpec,
  SignalConditionSpec,
  SubscriptionRuleSpec,
  SubscriptionRuleType,
  SubscriptionFrequency,
  SubscriptionTriggerSpec,
} from 'src/api/screener-subscription';

// ----------------------------------------------------------------------

export type SubscriptionBuilderState = {
  name: string;
  frequency: SubscriptionFrequency;
  status: Extract<SubscriptionStatus, 'ACTIVE' | 'PAUSED'>;
  ruleType: Exclude<SubscriptionRuleType, 'COMPOSITE'>;
  universe: UniverseSpec;
  filters: Partial<ScreenerFilters>;
  factorConditions: FactorConditionSpec[];
  signalConditions: SignalConditionSpec[];
  minSatisfied: number;
  triggerSpec: SubscriptionTriggerSpec;
};

export const DEFAULT_UNIVERSE: UniverseSpec = {
  type: 'ALL_A',
  excludeSt: true,
  excludeSuspended: true,
  excludeBse: false,
};

export function defaultTriggerSpec(
  ruleType: SubscriptionBuilderState['ruleType'] = 'STOCK_SCREENING'
): SubscriptionTriggerSpec {
  const isSignal = ruleType === 'SIGNAL_EVENT';
  return {
    mode: isSignal ? 'EVENT' : 'ENTER',
    notifyOnInitialMatch: isSignal,
    eventWindow: isSignal ? 'SINCE_LAST_SUCCESS' : 'CURRENT_TRADE_DATE',
    cooldownTradingDays: 0,
    maxHitsPerNotification: 20,
  };
}

export function createBuilderState(
  input: Partial<SubscriptionBuilderState> = {}
): SubscriptionBuilderState {
  const ruleType = input.ruleType ?? 'STOCK_SCREENING';
  return {
    name: input.name ?? '',
    frequency: input.frequency ?? 'DAILY',
    status: input.status ?? 'ACTIVE',
    ruleType,
    universe: input.universe ?? DEFAULT_UNIVERSE,
    filters: input.filters ?? {},
    factorConditions: input.factorConditions ?? [],
    signalConditions: input.signalConditions ?? [],
    minSatisfied: input.minSatisfied ?? 1,
    triggerSpec: { ...defaultTriggerSpec(ruleType), ...input.triggerSpec },
  };
}

export function buildRuleSpec(state: SubscriptionBuilderState): SubscriptionRuleSpec {
  if (state.ruleType === 'STOCK_SCREENING') {
    return {
      type: 'STOCK_SCREENING',
      version: 1,
      universe: state.universe,
      filters: state.filters,
    };
  }

  if (state.ruleType === 'FACTOR_SCREENING') {
    return {
      type: 'FACTOR_SCREENING',
      version: 1,
      universe: state.universe,
      conditions: state.factorConditions,
    };
  }

  return {
    type: 'SIGNAL_EVENT',
    version: 1,
    universe: state.universe,
    conditions: state.signalConditions,
    minSatisfied: Math.min(Math.max(state.minSatisfied, 1), state.signalConditions.length || 1),
  };
}

export function countRuleConditions(state: SubscriptionBuilderState): number {
  if (state.ruleType === 'STOCK_SCREENING') return Object.keys(state.filters).length;
  if (state.ruleType === 'FACTOR_SCREENING') return state.factorConditions.length;
  return state.signalConditions.length;
}

export function validateBuilderState(state: SubscriptionBuilderState): string[] {
  const errors: string[] = [];
  const count = countRuleConditions(state);
  if (!state.name.trim()) errors.push('请输入订阅名称');
  if (count === 0) errors.push('至少添加一条规则条件');
  if (count > 10) errors.push('单条订阅最多 10 个条件');
  if (state.ruleType === 'SIGNAL_EVENT' && state.minSatisfied > count) {
    errors.push('至少满足数量不能超过技术信号条件数');
  }
  if (state.universe.type === 'FIXED' && state.universe.tsCodes.length === 0) {
    errors.push('固定股票范围至少需要一只股票');
  }
  return errors;
}

export function normalizeTsCodes(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\s,，]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    ),
  ].slice(0, 100);
}

export function switchRuleType(
  state: SubscriptionBuilderState,
  ruleType: SubscriptionBuilderState['ruleType']
): SubscriptionBuilderState {
  if (state.ruleType === ruleType) return state;
  return {
    ...state,
    ruleType,
    triggerSpec: defaultTriggerSpec(ruleType),
  };
}
