import type { ScreenerFilters } from 'src/api/screener';
import type { MetricDefinition, SignalConditionSpec } from 'src/api/screener-subscription';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { countRuleConditions } from './subscription-rule-reducer';
import { StockRulePanel, FactorRulePanel, SignalRulePanel } from './subscription-rule-condition-editors';
import {
  signalEventLabels,
  isMetricAvailable,
  metricDefaultValue,
  stockMetricFilterKey,
  metricNotReadyMessage,
} from './subscription-rule-metric-helpers';

import type { SubscriptionBuilderState } from './subscription-rule-reducer';

// ----------------------------------------------------------------------

const MAX_CONDITIONS = 10;
const SOURCE_BY_RULE_TYPE = {
  STOCK_SCREENING: 'STOCK',
  FACTOR_SCREENING: 'FACTOR',
  SIGNAL_EVENT: 'SIGNAL',
} as const;

type Props = {
  state: SubscriptionBuilderState;
  catalog: MetricDefinition[];
  loading: boolean;
  error: string;
  onChange: (patch: Partial<SubscriptionBuilderState>) => void;
  onError: (message: string) => void;
};

export function SubscriptionRuleConditionsCard({
  state,
  catalog,
  loading,
  error,
  onChange,
  onError,
}: Props) {
  const [stockMetricToAdd, setStockMetricToAdd] = useState<MetricDefinition | null>(null);
  const [factorMetricToAdd, setFactorMetricToAdd] = useState<MetricDefinition | null>(null);
  const [signalMetricToAdd, setSignalMetricToAdd] = useState<MetricDefinition | null>(null);

  const sourceMetrics = useMemo(
    () => catalog.filter((metric) => metric.source === SOURCE_BY_RULE_TYPE[state.ruleType]),
    [catalog, state.ruleType]
  );
  const unavailableSourceMetrics = sourceMetrics.filter((metric) => !isMetricAvailable(metric));
  const conditionCount = countRuleConditions(state);

  const addStockMetric = () => {
    if (!stockMetricToAdd || conditionCount >= MAX_CONDITIONS) return;
    if (!isMetricAvailable(stockMetricToAdd)) {
      onError(metricNotReadyMessage(stockMetricToAdd));
      return;
    }
    const key = stockMetricFilterKey(stockMetricToAdd);
    if (Object.prototype.hasOwnProperty.call(state.filters, key)) return;
    onChange({
      filters: {
        ...state.filters,
        [key]: metricDefaultValue(stockMetricToAdd),
      } as Partial<ScreenerFilters>,
    });
    setStockMetricToAdd(null);
  };

  const addFactorMetric = () => {
    if (!factorMetricToAdd || conditionCount >= MAX_CONDITIONS) return;
    if (!isMetricAvailable(factorMetricToAdd)) {
      onError(metricNotReadyMessage(factorMetricToAdd));
      return;
    }
    if (state.factorConditions.some((condition) => condition.factorId === factorMetricToAdd.id)) {
      return;
    }
    onChange({
      factorConditions: [
        ...state.factorConditions,
        { factorId: factorMetricToAdd.id, operator: 'GT', value: factorMetricToAdd.min ?? 0 },
      ],
    });
    setFactorMetricToAdd(null);
  };

  const addSignalMetric = () => {
    if (!signalMetricToAdd || conditionCount >= MAX_CONDITIONS) return;
    if (!isMetricAvailable(signalMetricToAdd)) {
      onError(metricNotReadyMessage(signalMetricToAdd));
      return;
    }
    if (state.signalConditions.some((condition) => condition.metricId === signalMetricToAdd.id)) {
      return;
    }
    const event = signalMetricToAdd.operators.find(
      (operator): operator is SignalConditionSpec['eventType'] => operator in signalEventLabels
    );
    if (!event) {
      onError('指标目录尚未提供可订阅的具体事件，暂不能添加该指标。');
      return;
    }
    onChange({
      signalConditions: [
        ...state.signalConditions,
        { metricId: signalMetricToAdd.id, eventType: event },
      ],
    });
    setSignalMetricToAdd(null);
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
              条件构建
            </Typography>
            <Chip label={`${conditionCount}/${MAX_CONDITIONS}`} size="small" variant="outlined" />
          </Box>
          {loading ? <Skeleton variant="rounded" height={120} /> : null}
          {!loading && error ? (
            <Alert severity="info">
              等待后端提供 Metric Catalog 后显示可选择指标。页面布局与提交契约已就绪。
            </Alert>
          ) : null}
          {!loading && !error && unavailableSourceMetrics.length > 0 ? (
            <Alert severity="warning">
              以下指标所需数据尚未就绪，暂不能添加或运行预览：
              {unavailableSourceMetrics.map((metric) => metric.label).join('、')}。
            </Alert>
          ) : null}
          {!loading && !error && state.ruleType === 'STOCK_SCREENING' ? (
            <StockRulePanel
              metrics={sourceMetrics}
              selected={stockMetricToAdd}
              filters={state.filters}
              disabled={conditionCount >= MAX_CONDITIONS}
              onSelectedChange={setStockMetricToAdd}
              onAdd={addStockMetric}
              onChange={(filters) => onChange({ filters })}
            />
          ) : null}
          {!loading && !error && state.ruleType === 'FACTOR_SCREENING' ? (
            <FactorRulePanel
              metrics={sourceMetrics}
              selected={factorMetricToAdd}
              conditions={state.factorConditions}
              disabled={conditionCount >= MAX_CONDITIONS}
              onSelectedChange={setFactorMetricToAdd}
              onAdd={addFactorMetric}
              onChange={(factorConditions) => onChange({ factorConditions })}
            />
          ) : null}
          {!loading && !error && state.ruleType === 'SIGNAL_EVENT' ? (
            <SignalRulePanel
              metrics={sourceMetrics}
              selected={signalMetricToAdd}
              conditions={state.signalConditions}
              minSatisfied={state.minSatisfied}
              disabled={conditionCount >= MAX_CONDITIONS}
              onSelectedChange={setSignalMetricToAdd}
              onAdd={addSignalMetric}
              onChange={(signalConditions) => onChange({ signalConditions })}
              onMinSatisfiedChange={(minSatisfied) => onChange({ minSatisfied })}
            />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
