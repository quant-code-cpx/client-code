import type { StockSearchItem } from 'src/api/stock';

import { useEffect } from 'react';

import {
  stockItemFromCode,
  StockSearchAutocomplete,
} from 'src/components/stock-search-autocomplete';

import type { GenerateFormProps, GenerateStockParams } from './types';

type Props = GenerateFormProps<GenerateStockParams>;

export function GenerateFormStock({ value, onChange, onValidChange }: Props) {
  useEffect(() => {
    onValidChange?.(value.tsCode.trim().length > 0);
  }, [value.tsCode, onValidChange]);

  const item: StockSearchItem | null = stockItemFromCode(value.tsCode);

  return (
    <StockSearchAutocomplete
      label="选择股票"
      placeholder="输入股票代码或名称"
      value={item}
      fullWidth
      onChange={(stock) => onChange({ tsCode: stock?.tsCode ?? '' })}
    />
  );
}
