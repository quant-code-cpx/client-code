import type {
  FactorCondition,
  FactorConditionOperator,
  FactorScreeningTradeConstraints,
} from 'src/api/factor';

import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DEFAULT_TRADE_CONSTRAINTS } from './screening-constants';

// ----------------------------------------------------------------------

export type SortMode = 'single' | 'composite';

export type ScreeningQueryState = {
  tradeDate: string; // YYYYMMDD
  universe: string; // '' = 全市场
  conditions: FactorCondition[];
  sortMode: SortMode;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  tradeConstraints: FactorScreeningTradeConstraints;
};

const KEY = {
  tradeDate: 'd',
  universe: 'u',
  conditions: 'c',
  sortMode: 'sm',
  sortBy: 'sb',
  sortOrder: 'so',
  excludeSt: 'eSt',
  excludeSuspended: 'eSp',
  excludeBse: 'eBse',
  minListDays: 'mLd',
} as const;

const VALID_OPERATORS: FactorConditionOperator[] = [
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'top_pct',
  'bottom_pct',
];

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function isValidYmd(s: string): boolean {
  return /^\d{8}$/.test(s);
}

function encodeConditions(conditions: FactorCondition[]): string {
  // 仅保留 factorName 非空的条件
  const filtered = conditions.filter((c) => c.factorName);
  if (filtered.length === 0) return '';
  // pipe + colon 编码，避免 base64 在 URL 上的可读性问题
  return filtered
    .map((c) => {
      const parts: string[] = [c.factorName, c.operator];
      const append = (label: string, v: number | undefined) => {
        if (typeof v === 'number' && Number.isFinite(v)) {
          parts.push(`${label}${v}`);
        }
      };
      append('v', c.value);
      append('mn', c.min);
      append('mx', c.max);
      append('p', c.percent);
      return parts.join(':');
    })
    .join('|');
}

function decodeConditions(raw: string | null): FactorCondition[] {
  if (!raw) return [];
  return raw
    .split('|')
    .map((seg) => {
      const tokens = seg.split(':');
      if (tokens.length < 2) return null;
      const [factorName, operator, ...rest] = tokens;
      if (!factorName || !VALID_OPERATORS.includes(operator as FactorConditionOperator)) {
        return null;
      }
      const cond: FactorCondition = {
        factorName,
        operator: operator as FactorConditionOperator,
      };
      rest.forEach((t) => {
        if (t.startsWith('v')) {
          const n = Number(t.slice(1));
          if (Number.isFinite(n)) cond.value = n;
        } else if (t.startsWith('mn')) {
          const n = Number(t.slice(2));
          if (Number.isFinite(n)) cond.min = n;
        } else if (t.startsWith('mx')) {
          const n = Number(t.slice(2));
          if (Number.isFinite(n)) cond.max = n;
        } else if (t.startsWith('p')) {
          const n = Number(t.slice(1));
          if (Number.isFinite(n)) cond.percent = n;
        }
      });
      return cond;
    })
    .filter((c): c is FactorCondition => c !== null);
}

// ----------------------------------------------------------------------

export function useScreeningQueryState() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<ScreeningQueryState>(() => {
    const tradeDateRaw = params.get(KEY.tradeDate);
    const tradeDate = tradeDateRaw && isValidYmd(tradeDateRaw) ? tradeDateRaw : todayYmd();
    const sortMode = (params.get(KEY.sortMode) as SortMode) || 'single';
    const sortOrder = (params.get(KEY.sortOrder) as 'asc' | 'desc') || 'desc';

    const tradeConstraints: FactorScreeningTradeConstraints = {
      excludeSt:
        params.get(KEY.excludeSt) === '1' || params.get(KEY.excludeSt) === null
          ? DEFAULT_TRADE_CONSTRAINTS.excludeSt
          : false,
      excludeSuspended:
        params.get(KEY.excludeSuspended) === '1' || params.get(KEY.excludeSuspended) === null
          ? DEFAULT_TRADE_CONSTRAINTS.excludeSuspended
          : false,
      excludeBse: params.get(KEY.excludeBse) === '1',
      minListDays: (() => {
        const raw = params.get(KEY.minListDays);
        if (raw === null) return DEFAULT_TRADE_CONSTRAINTS.minListDays;
        const n = Number(raw);
        return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TRADE_CONSTRAINTS.minListDays;
      })(),
    };

    return {
      tradeDate,
      universe: params.get(KEY.universe) || '',
      conditions: decodeConditions(params.get(KEY.conditions)),
      sortMode,
      sortBy: params.get(KEY.sortBy) || '',
      sortOrder,
      tradeConstraints,
    };
  }, [params]);

  const patch = useCallback(
    (next: Partial<ScreeningQueryState>) => {
      const sp = new URLSearchParams(params);

      if (next.tradeDate !== undefined) sp.set(KEY.tradeDate, next.tradeDate);
      if (next.universe !== undefined) {
        if (next.universe) sp.set(KEY.universe, next.universe);
        else sp.delete(KEY.universe);
      }
      if (next.conditions !== undefined) {
        const enc = encodeConditions(next.conditions);
        if (enc) sp.set(KEY.conditions, enc);
        else sp.delete(KEY.conditions);
      }
      if (next.sortMode !== undefined) sp.set(KEY.sortMode, next.sortMode);
      if (next.sortBy !== undefined) {
        if (next.sortBy) sp.set(KEY.sortBy, next.sortBy);
        else sp.delete(KEY.sortBy);
      }
      if (next.sortOrder !== undefined) sp.set(KEY.sortOrder, next.sortOrder);
      if (next.tradeConstraints !== undefined) {
        sp.set(KEY.excludeSt, next.tradeConstraints.excludeSt ? '1' : '0');
        sp.set(KEY.excludeSuspended, next.tradeConstraints.excludeSuspended ? '1' : '0');
        sp.set(KEY.excludeBse, next.tradeConstraints.excludeBse ? '1' : '0');
        sp.set(KEY.minListDays, String(next.tradeConstraints.minListDays ?? 0));
      }

      setParams(sp, { replace: true });
    },
    [params, setParams]
  );

  return { state, patch };
}

// 暴露给测试 / 外部使用
export const __screeningStateInternals = { encodeConditions, decodeConditions };
