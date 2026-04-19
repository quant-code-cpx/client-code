import { MoneyFlowCard } from 'src/components/money-flow-card';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketMoneyFlowCard({ tradeDate }: Props) {
  return <MoneyFlowCard tradeDate={tradeDate} />;
}
