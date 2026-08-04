import type {
  MetricDefinition,
  SubscriptionRuleSpec,
  SubscriptionTriggerSpec,
} from 'src/api/screener-subscription';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  metrics: MetricDefinition[];
  ruleSpec: SubscriptionRuleSpec;
  triggerSpec: SubscriptionTriggerSpec;
};

const modeLabels = { ENTER: '新进入', EXIT: '退出', BOTH: '进入和退出', EVENT: '事件出现' };

export function SubscriptionRuleSummary({ metrics, ruleSpec, triggerSpec }: Props) {
  const metricMap = new Map(metrics.map((metric) => [metric.id, metric]));
  const conditionLabels =
    ruleSpec.type === 'STOCK_SCREENING'
      ? Object.keys(ruleSpec.filters).map((key) => metricMap.get(key)?.label ?? key)
      : ruleSpec.conditions.map((condition) => {
          const id = 'factorId' in condition ? condition.factorId : condition.metricId;
          return metricMap.get(id)?.label ?? id;
        });

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        提交摘要
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        <Chip size="small" label={modeLabels[triggerSpec.mode]} variant="outlined" />
        <Chip
          size="small"
          label={`通知最多 ${triggerSpec.maxHitsPerNotification} 条`}
          variant="outlined"
        />
        {conditionLabels.map((label) => (
          <Chip key={label} size="small" label={label} color="primary" variant="outlined" />
        ))}
      </Box>
    </Box>
  );
}
