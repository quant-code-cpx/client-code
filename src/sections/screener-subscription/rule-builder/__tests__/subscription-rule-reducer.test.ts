import { it, expect, describe } from 'vitest';

import {
  buildRuleSpec,
  switchRuleType,
  normalizeTsCodes,
  createBuilderState,
  validateBuilderState,
} from '../subscription-rule-reducer';

// ----------------------------------------------------------------------

describe('subscription rule builder state', () => {
  it('uses event semantics and initial-event notification for technical rules', () => {
    const state = switchRuleType(createBuilderState(), 'SIGNAL_EVENT');

    expect(state.triggerSpec).toMatchObject({
      mode: 'EVENT',
      notifyOnInitialMatch: true,
      eventWindow: 'SINCE_LAST_SUCCESS',
    });
  });

  it('caps minSatisfied at existing signal condition count in v1 payload', () => {
    const state = createBuilderState({
      name: 'MACD 信号',
      ruleType: 'SIGNAL_EVENT',
      signalConditions: [{ metricId: 'macd', eventType: 'GOLDEN_CROSS' }],
      minSatisfied: 3,
    });

    expect(buildRuleSpec(state)).toEqual({
      type: 'SIGNAL_EVENT',
      version: 1,
      universe: {
        type: 'ALL_A',
        excludeSt: true,
        excludeSuspended: true,
        excludeBse: false,
      },
      conditions: [{ metricId: 'macd', eventType: 'GOLDEN_CROSS' }],
      minSatisfied: 1,
    });
  });

  it('rejects an active rule with no conditions instead of submitting an empty subscription', () => {
    const state = createBuilderState({ name: '空规则' });

    expect(validateBuilderState(state)).toContain('至少添加一条规则条件');
  });

  it('normalizes fixed stock codes and removes duplicates before sending v1 rule payload', () => {
    expect(normalizeTsCodes('600519.sh, 000001.sz\n600519.SH')).toEqual(['600519.SH', '000001.SZ']);
  });
});
