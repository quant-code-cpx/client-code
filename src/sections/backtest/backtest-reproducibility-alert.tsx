import type { BacktestRunDetailResponse } from 'src/api/backtest';

import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type BacktestReproducibilityAlertProps = Pick<
  BacktestRunDetailResponse,
  | 'engineVersion'
  | 'dataContractVersion'
  | 'universePolicyVersion'
  | 'financialAsOfPolicyVersion'
  | 'adjustmentPolicyVersion'
  | 'reproducibilityStatus'
  | 'reproducibilityManifest'
  | 'qualityFlags'
>;

const VERSION_LABELS: Array<{
  key:
    | 'engineVersion'
    | 'dataContractVersion'
    | 'universePolicyVersion'
    | 'financialAsOfPolicyVersion'
    | 'adjustmentPolicyVersion';
  label: string;
}> = [
  { key: 'engineVersion', label: '引擎' },
  { key: 'dataContractVersion', label: '数据合同' },
  { key: 'universePolicyVersion', label: '股票池' },
  { key: 'financialAsOfPolicyVersion', label: '财务时点' },
  { key: 'adjustmentPolicyVersion', label: '复权' },
];

export function BacktestReproducibilityAlert(props: BacktestReproducibilityAlertProps) {
  const versions = VERSION_LABELS.map((item) => ({
    ...item,
    value: props[item.key],
  }));
  const hasCompleteVersions = versions.every((item) => Boolean(item.value));
  const manifest = props.reproducibilityManifest;
  const flags = Array.from(new Set([...(props.qualityFlags ?? []), ...(manifest?.qualityFlags ?? [])]));
  const hasValidManifest =
    Boolean(manifest?.inputHash?.match(/^[a-f0-9]{64}$/)) &&
    Boolean(manifest?.universeSnapshots.length) &&
    versions.every((item) => item.value === manifest?.[item.key]);
  const verified =
    props.reproducibilityStatus === 'VERIFIED' &&
    hasCompleteVersions &&
    hasValidManifest &&
    flags.length === 0;
  const pending = props.reproducibilityStatus === 'PENDING';

  const severity = verified ? 'success' : pending ? 'info' : 'warning';
  const title = verified
    ? '结果已通过可复现性校验'
    : pending
      ? '可复现性校验尚未完成'
      : '旧回测或可信元数据不完整';
  const description = verified
    ? '股票池、公告可得日与复权口径已绑定到本次运行，可用于研究复盘。'
    : '该结果可能包含幸存者偏差、公告日前视或复权口径风险，请勿据此下强结论。';

  return (
    <Alert severity={severity} sx={{ mt: 3 }}>
      <Stack spacing={1.25}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2">{description}</Typography>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {versions.map((item) => (
            <Chip
              key={item.key}
              size="small"
              variant="outlined"
              label={`${item.label}：${item.value ?? '缺失'}`}
              sx={{ maxWidth: '100%' }}
            />
          ))}
        </Stack>

        {flags.length > 0 ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
            质量标记：{flags.join('、')}
          </Typography>
        ) : null}
      </Stack>
    </Alert>
  );
}
