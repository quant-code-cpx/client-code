import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import {
  MaCrossPanel,
  CustomPoolPanel,
  FactorRankingPanel,
  ScreeningRotationPanel,
} from './backtest-strategy-template-panels';

import type { BacktestRunForm, FactorRankingConfig } from './types';

// ----------------------------------------------------------------------

interface BacktestStrategyConfigPanelProps {
  selectedTemplateId: string;
  form: BacktestRunForm;
  fieldIdPrefix?: string;
  onChange: (updates: Partial<BacktestRunForm>) => void;
}

export function BacktestStrategyConfigPanel({
  selectedTemplateId,
  form,
  fieldIdPrefix = 'backtest-strategy-config',
  onChange,
}: BacktestStrategyConfigPanelProps) {
  const [factorOptions, setFactorOptions] = useState<string[]>([]);
  const [factorError, setFactorError] = useState('');

  const loadFactorOptions = useCallback(() => {
    if (selectedTemplateId === 'FACTOR_RANKING') {
      setFactorError('');
      import('src/api/factor')
        .then(({ factorApi }) =>
          factorApi.library().then((res) => {
            const names = (res.categories ?? []).flatMap((group) =>
              group.factors.map((factor) => factor.name)
            );
            setFactorOptions(names);
          })
        )
        .catch((err: unknown) => {
          setFactorOptions([]);
          setFactorError(err instanceof Error ? err.message : '因子列表加载失败');
        });
      return;
    }
    setFactorError('');
  }, [selectedTemplateId]);

  useEffect(() => {
    loadFactorOptions();
  }, [loadFactorOptions]);

  const strategyConfig = form.strategyConfig as Record<string, unknown>;

  const renderPanel = () => {
    switch (selectedTemplateId) {
      case 'MA_CROSS_SINGLE':
        return (
          <MaCrossPanel
            config={{
              tsCode: (strategyConfig.tsCode as string) ?? '',
              shortWindow: (strategyConfig.shortWindow as number) ?? 5,
              longWindow: (strategyConfig.longWindow as number) ?? 20,
              allowFlat: (strategyConfig.allowFlat as boolean) ?? false,
            }}
            fieldIdPrefix={fieldIdPrefix}
            onChange={(config) =>
              onChange({ strategyConfig: config as unknown as Record<string, unknown> })
            }
          />
        );

      case 'SCREENING_ROTATION':
        return (
          <ScreeningRotationPanel
            config={{
              rankBy: (strategyConfig.rankBy as string) ?? 'totalMv',
              rankOrder: (strategyConfig.rankOrder as 'asc' | 'desc') ?? 'desc',
              topN: (strategyConfig.topN as number) ?? 20,
              minDaysListed: strategyConfig.minDaysListed as number | undefined,
            }}
            fieldIdPrefix={fieldIdPrefix}
            onChange={(config) =>
              onChange({ strategyConfig: config as unknown as Record<string, unknown> })
            }
          />
        );

      case 'FACTOR_RANKING':
        return (
          <FactorRankingPanel
            config={{
              factorName: (strategyConfig.factorName as string) ?? '',
              rankOrder: (strategyConfig.rankOrder as 'asc' | 'desc') ?? 'desc',
              topN: (strategyConfig.topN as number) ?? 20,
              minDaysListed: strategyConfig.minDaysListed as number | undefined,
              optionalFilters:
                strategyConfig.optionalFilters as FactorRankingConfig['optionalFilters'],
            }}
            onChange={(config) =>
              onChange({ strategyConfig: config as unknown as Record<string, unknown> })
            }
            factorOptions={factorOptions}
          />
        );

      case 'CUSTOM_POOL_REBALANCE':
        return (
          <CustomPoolPanel
            config={{
              tsCodes: (strategyConfig.tsCodes as string[]) ?? [],
              weightMode: (strategyConfig.weightMode as 'EQUAL' | 'CUSTOM') ?? 'EQUAL',
              customWeights:
                (strategyConfig.customWeights as Array<{ tsCode: string; weight: number }>) ?? [],
            }}
            onChange={(config) =>
              onChange({ strategyConfig: config as unknown as Record<string, unknown> })
            }
            availableTsCodes={form.customUniverseTsCodes}
          />
        );

      case 'FACTOR_SCREENING_ROTATION':
        return (
          <Alert severity="info" sx={{ mt: 1 }}>
            此模板由因子市场模块触发，策略条件已预置传入，无需手动配置。如需修改条件，请返回「因子市场」重新发起回测。
          </Alert>
        );

      default:
        return (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            请先选择策略模板
          </Typography>
        );
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          策略参数
        </Typography>
        {factorError ? (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button size="small" color="inherit" onClick={loadFactorOptions}>
                重试
              </Button>
            }
          >
            {factorError}
          </Alert>
        ) : null}
        {renderPanel()}
      </CardContent>
    </Card>
  );
}
