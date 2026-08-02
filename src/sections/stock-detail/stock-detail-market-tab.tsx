import type { StockMoneyFlowData, StockTodayFlowData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';

import { stockDetailApi } from 'src/api/stock';

import { MarketChartCard } from './market/market-chart-card';
import { MoneyFlowCard, TodayFlowCard } from './market/market-flow-cards';

type Props = {
  tsCode: string;
};

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function StockDetailMarketTab({ tsCode }: Props) {
  const [todayFlow, setTodayFlow] = useState<StockTodayFlowData | null>(null);
  const [todayFlowLoading, setTodayFlowLoading] = useState(false);
  const [todayFlowError, setTodayFlowError] = useState('');
  const [moneyFlow, setMoneyFlow] = useState<StockMoneyFlowData | null>(null);
  const [moneyFlowLoading, setMoneyFlowLoading] = useState(false);
  const [moneyFlowError, setMoneyFlowError] = useState('');

  const fetchTodayFlow = useCallback(async () => {
    if (!tsCode) return;
    setTodayFlowLoading(true);
    setTodayFlowError('');
    try {
      setTodayFlow(await stockDetailApi.todayFlow(tsCode));
    } catch (error) {
      setTodayFlowError(toMessage(error, '获取今日资金流向失败'));
    } finally {
      setTodayFlowLoading(false);
    }
  }, [tsCode]);

  const fetchMoneyFlow = useCallback(async () => {
    if (!tsCode) return;
    setMoneyFlowLoading(true);
    setMoneyFlowError('');
    try {
      setMoneyFlow(await stockDetailApi.moneyFlow(tsCode, 60));
    } catch (error) {
      setMoneyFlowError(toMessage(error, '获取资金流向失败'));
    } finally {
      setMoneyFlowLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    void fetchTodayFlow();
    void fetchMoneyFlow();
  }, [fetchMoneyFlow, fetchTodayFlow]);

  return (
    <Stack spacing={3}>
      <MarketChartCard tsCode={tsCode} />
      <TodayFlowCard data={todayFlow} loading={todayFlowLoading} error={todayFlowError} />
      <MoneyFlowCard
        tsCode={tsCode}
        data={moneyFlow}
        loading={moneyFlowLoading}
        error={moneyFlowError}
      />
    </Stack>
  );
}
