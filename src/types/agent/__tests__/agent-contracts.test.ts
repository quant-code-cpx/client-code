import { it, expect, describe } from 'vitest';

import {
  AGENT_TOOL_KEYS,
  AGENT_EVENT_TYPES,
  parseMessageBlock,
  AGENT_RUN_STATUSES,
  TOOL_CALL_STATUSES,
  AgentProtocolError,
  parseAgentSseEvent,
  MODEL_CALL_STATUSES,
  AGENT_EVENT_FIXTURES,
  MESSAGE_BLOCK_FIXTURES,
  AGENT_ERROR_DEFINITIONS,
  isSupportedMessageBlock,
} from '../generated';

describe('Agent 公共契约', () => {
  it('解析后端生成的全部 SSE fixture', () => {
    expect(AGENT_EVENT_FIXTURES).toHaveLength(AGENT_EVENT_TYPES.length);
    expect(AGENT_EVENT_FIXTURES.map((event) => event.type)).toEqual(AGENT_EVENT_TYPES);

    for (const fixture of AGENT_EVENT_FIXTURES) {
      expect(parseAgentSseEvent(fixture)).toEqual(fixture);
    }
  });

  it('解析后端生成的全部 6 类 MessageBlock fixture', () => {
    expect(MESSAGE_BLOCK_FIXTURES).toHaveLength(6);

    for (const fixture of MESSAGE_BLOCK_FIXTURES) {
      expect(parseMessageBlock(fixture)).toEqual(fixture);
    }
  });

  it('未知 SSE event 返回 typed protocol error', () => {
    const unknownEvent = { ...AGENT_EVENT_FIXTURES[0], type: 'agent.unknown' };

    expect(() => parseAgentSseEvent(unknownEvent)).toThrow(AgentProtocolError);
  });

  it('非法 MessageBlock 可被安全过滤，不拖垮消息解析流程', () => {
    const invalidBlock = { blockId: 'invalid', schemaVersion: 1, type: 'UNKNOWN' };

    expect(isSupportedMessageBlock(invalidBlock)).toBe(false);
    expect(() => parseMessageBlock(invalidBlock)).toThrow(AgentProtocolError);
  });

  it('固定生成契约中的全部 Agent Tool key', () => {
    expect(AGENT_TOOL_KEYS).toEqual([
      'resolve_security',
      'get_stock_price_history',
      'get_stock_overview',
      'screen_stocks',
      'get_financial_statements',
      'get_financial_indicators',
      'get_stock_moneyflow',
      'get_market_snapshot',
      'get_sector_membership',
      'get_user_watchlist',
      'get_portfolio_risk',
      'get_backtest_result',
      'compute_performance_metrics',
      'compute_valuation_percentile',
      'search_web',
      'fetch_web_page',
      'get_stock_technical_indicators',
      'get_stock_technical_signals',
      'get_data_availability',
      'get_stock_chip_profile',
      'get_stock_margin_history',
      'get_stock_relative_strength',
      'get_stock_events',
      'get_stock_shareholder_profile',
      'get_index_market_data',
      'get_fund_research',
      'get_industry_rotation',
      'get_factor_analysis',
      'get_macro_snapshot',
      'get_option_market',
      'get_convertible_bond_market',
      'run_event_study',
      'get_backtest_analytics',
      'get_portfolio_analytics',
      'get_market_news',
      'save_research_report',
    ]);
  });

  it('Run、ToolCall、ModelCall 状态与公共协议一致', () => {
    expect(AGENT_RUN_STATUSES).toEqual([
      'QUEUED',
      'RUNNING',
      'CANCEL_REQUESTED',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
    ]);
    expect(TOOL_CALL_STATUSES).toEqual([
      'PENDING',
      'AUTHORIZING',
      'RUNNING',
      'RETRY_WAIT',
      'SUCCEEDED',
      'FAILED',
      'CANCELLED',
      'REJECTED',
    ]);
    expect(MODEL_CALL_STATUSES).toEqual([
      'PENDING',
      'STREAMING',
      'RETRY_WAIT',
      'SUCCEEDED',
      'FAILED',
      'CANCELLED',
    ]);
  });

  it('错误码覆盖 6001–6049 与 6099，且无重复', () => {
    const codes = AGENT_ERROR_DEFINITIONS.map((definition) => definition.code);

    expect(codes).toEqual([...Array.from({ length: 49 }, (_, index) => 6001 + index), 6099]);
    expect(new Set(codes).size).toBe(50);
  });
});
