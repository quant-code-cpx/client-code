import type { Strategy } from 'src/api/strategy';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { updateStrategy } from 'src/api/strategy';

import { Iconify } from 'src/components/iconify';

import { RANK_BY_OPTIONS } from '../backtest/constants';
import { BacktestStrategyConfigPanel } from '../backtest/backtest-strategy-config-panel';

import type { BacktestRunForm } from '../backtest/types';

// ----------------------------------------------------------------------

const RANK_BY_LABEL: Record<string, string> = Object.fromEntries(
  RANK_BY_OPTIONS.map(({ value, label }) => [value, label])
);

// ----------------------------------------------------------------------

interface StrategyConfigCardProps {
  strategy: Strategy;
  onUpdate: (updated: Strategy) => void;
}

export function StrategyConfigCard({ strategy, onUpdate }: StrategyConfigCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Build a minimal BacktestRunForm just for the config panel
  const [form, setForm] = useState<BacktestRunForm>(() => ({
    name: '',
    startDate: '2020-01-01',
    endDate: '2024-12-31',
    initialCapital: 1000000,
    benchmarkTsCode: '000300.SH',
    universe: 'HS300',
    customUniverseTsCodes: [],
    rebalanceFrequency: 'MONTHLY',
    priceMode: 'NEXT_OPEN',
    enableTradeConstraints: true,
    commissionRate: 0.0003,
    stampDutyRate: 0.0005,
    minCommission: 5,
    slippageBps: 5,
    maxPositions: 20,
    maxWeightPerStock: 0.1,
    minDaysListed: 60,
    strategyConfig: { ...strategy.strategyConfig },
  }));

  const handleEdit = () => {
    setForm((prev) => ({ ...prev, strategyConfig: { ...strategy.strategyConfig } }));
    setError('');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
  };

  const handleFormChange = useCallback((updates: Partial<BacktestRunForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateStrategy({
        id: strategy.id,
        strategyConfig: form.strategyConfig,
      });
      onUpdate(updated);
      setEditing(false);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="fontWeightBold">
            策略参数
          </Typography>
          {!editing && (
            <Button size="small" startIcon={<Iconify icon="solar:pen-bold" />} onClick={handleEdit}>
              编辑
            </Button>
          )}
        </Box>

        {editing ? (
          <Box>
            <BacktestStrategyConfigPanel
              selectedTemplateId={strategy.strategyType}
              form={form}
              onChange={handleFormChange}
            />
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {error}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
              <Button variant="outlined" onClick={handleCancel} disabled={saving}>
                取消
              </Button>
              <Button variant="contained" onClick={handleSave} loading={saving}>
                保存
              </Button>
            </Box>
          </Box>
        ) : (
          <ConfigDisplay strategyType={strategy.strategyType} config={strategy.strategyConfig} />
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

function ConfigDisplay({
  strategyType,
  config,
}: {
  strategyType: string;
  config: Record<string, unknown>;
}) {
  if (strategyType === 'MA_CROSS_SINGLE') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <ConfigRow label="标的代码" value={String(config.tsCode || '-')} />
        <ConfigRow label="短期均线" value={`${config.shortWindow ?? '-'} 日`} />
        <ConfigRow label="长期均线" value={`${config.longWindow ?? '-'} 日`} />
        <ConfigRow label="允许空仓" value={config.allowFlat ? '是' : '否'} />
      </Box>
    );
  }

  if (strategyType === 'SCREENING_ROTATION') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <ConfigRow
          label="排序指标"
          value={RANK_BY_LABEL[config.rankBy as string] ?? String(config.rankBy ?? '-')}
        />
        <ConfigRow
          label="排序方向"
          value={config.rankOrder === 'asc' ? '升序（小值优先）' : '降序（大值优先）'}
        />
        <ConfigRow label="持仓数量" value={`前 ${config.topN ?? '-'} 名`} />
        <ConfigRow label="上市天数" value={`至少 ${config.minDaysListed ?? '-'} 天`} />
      </Box>
    );
  }

  if (strategyType === 'FACTOR_RANKING') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <ConfigRow label="因子名称" value={String(config.factorName || '-')} />
        <ConfigRow
          label="排序方向"
          value={config.rankOrder === 'asc' ? '升序（小值优先）' : '降序（大值优先）'}
        />
        <ConfigRow label="持仓数量" value={`前 ${config.topN ?? '-'} 名`} />
        <ConfigRow label="上市天数" value={`至少 ${config.minDaysListed ?? '-'} 天`} />
      </Box>
    );
  }

  if (strategyType === 'CUSTOM_POOL_REBALANCE') {
    const tsCodes = (config.tsCodes as string[]) ?? [];
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <ConfigRow label="权重模式" value={config.weightMode === 'EQUAL' ? '等权' : '自定义权重'} />
        <ConfigRow label="股票数量" value={`${tsCodes.length} 只`} />
        {tsCodes.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              股票列表
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {tsCodes.map((code) => (
                <Typography
                  key={code}
                  variant="caption"
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.5,
                    bgcolor: 'action.selected',
                    fontFamily: 'monospace',
                  }}
                >
                  {code}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  if (strategyType === 'FACTOR_SCREENING_ROTATION') {
    const conditions = (config.conditions as unknown[]) ?? [];
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <ConfigRow
          label="排序方向"
          value={config.sortOrder === 'asc' ? '升序（小值优先）' : '降序（大值优先）'}
        />
        <ConfigRow label="持仓数量" value={`前 ${config.topN ?? '-'} 名`} />
        <ConfigRow
          label="权重方式"
          value={
            config.weightMethod === 'equal_weight' ? '等权' : String(config.weightMethod ?? '-')
          }
        />
        <Divider />
        <ConfigRow label="筛选条件数" value={`${conditions.length} 个`} />
      </Box>
    );
  }

  // Fallback: raw JSON
  return (
    <Box
      component="pre"
      sx={{
        fontSize: 12,
        fontFamily: 'monospace',
        bgcolor: 'action.hover',
        p: 1.5,
        borderRadius: 1,
        overflow: 'auto',
        m: 0,
      }}
    >
      {JSON.stringify(config, null, 2)}
    </Box>
  );
}

// ----------------------------------------------------------------------

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 72, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
