import type { StockSDK, SimpleQuote } from 'stock-sdk';

import { useRef, useState, useEffect } from 'react';

import { toSdkCode } from 'src/utils/stock-code';

// ----------------------------------------------------------------------
// 浏览器端实时行情轮询 Hook（best-effort，失败静默降级到快照）
// ----------------------------------------------------------------------

const REFRESH_MS = 15_000;
const STALE_MS = 35_000;
const SESSION_TICK_MS = 5_000;

type MarketSession = 'open' | 'lunch' | 'closed';

export type RealtimeQuote = {
  price: number;
  change: number;
  changePercent: number;
};

export type UseRealtimeQuoteResult = {
  /** 实时报价；尚未取到或非交易时段为 null */
  quote: RealtimeQuote | null;
  /** 最近一次成功取数的本地时间戳（毫秒） */
  dataTime: number | null;
  /** 当前市场时段 */
  session: MarketSession;
  /** 是否处于实时（交易时段 + 已取到数据） */
  isLive: boolean;
  /** 实时数据是否已超过容忍间隔仍未刷新 */
  isStale: boolean;
};

// stock-sdk 单例，避免重复实例化
let sdkInstance: StockSDK | null = null;

async function fetchSimpleQuote(sdkCode: string): Promise<SimpleQuote | null> {
  if (!sdkInstance) {
    const { StockSDK } = await import('stock-sdk');
    sdkInstance = new StockSDK();
  }
  const list = await sdkInstance.getSimpleQuotes([sdkCode]);
  return list?.[0] ?? null;
}

function getMarketSession(now: Date = new Date()): MarketSession {
  const day = now.getDay();
  if (day === 0 || day === 6) return 'closed';
  const mins = now.getHours() * 60 + now.getMinutes();
  const morningOpen = 9 * 60 + 30;
  const morningClose = 11 * 60 + 30;
  const afternoonOpen = 13 * 60;
  const afternoonClose = 15 * 60;
  if (
    (mins >= morningOpen && mins <= morningClose) ||
    (mins >= afternoonOpen && mins <= afternoonClose)
  ) {
    return 'open';
  }
  if (mins > morningClose && mins < afternoonOpen) return 'lunch';
  return 'closed';
}

export function useRealtimeQuote(tsCode: string): UseRealtimeQuoteResult {
  const [quote, setQuote] = useState<RealtimeQuote | null>(null);
  const [dataTime, setDataTime] = useState<number | null>(null);
  const [session, setSession] = useState<MarketSession>(() => getMarketSession());
  const [tick, setTick] = useState(() => Date.now());

  const dataTimeRef = useRef<number | null>(null);
  dataTimeRef.current = dataTime;

  useEffect(() => {
    setQuote(null);
    setDataTime(null);
    dataTimeRef.current = null;

    const sdkCode = toSdkCode(tsCode);
    const initialSession = getMarketSession();
    setSession(initialSession);

    if (!sdkCode || initialSession !== 'open') {
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const q = await fetchSimpleQuote(sdkCode);
        if (cancelled || !q) return;
        if (Number.isFinite(q.price) && q.price > 0) {
          setQuote({ price: q.price, change: q.change, changePercent: q.changePercent });
          setDataTime(Date.now());
        }
      } catch {
        // 静默降级：保留上次值，由调用方回退到快照
      }
    };

    void load();

    const refreshTimer = setInterval(() => {
      const current = getMarketSession();
      if (current !== 'open') {
        setSession(current);
        return;
      }
      void load();
    }, REFRESH_MS);

    const sessionTimer = setInterval(() => setTick(Date.now()), SESSION_TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
      clearInterval(sessionTimer);
    };
  }, [tsCode]);

  const isLive = quote != null && session === 'open';
  const isStale = isLive && dataTime != null && tick - dataTime > STALE_MS;

  return { quote, dataTime, session, isLive, isStale };
}
