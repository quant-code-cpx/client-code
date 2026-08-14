import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { normalizeTsCodes } from './subscription-rule-reducer';

import type { SubscriptionBuilderState } from './subscription-rule-reducer';

// ----------------------------------------------------------------------

const ruleTypeLabels: Record<SubscriptionBuilderState['ruleType'], string> = {
  STOCK_SCREENING: '基础选股',
  FACTOR_SCREENING: '因子选股',
  SIGNAL_EVENT: '技术信号',
};

type ChangeHandler = (patch: Partial<SubscriptionBuilderState>) => void;

type BasicsProps = {
  state: SubscriptionBuilderState;
  onChange: ChangeHandler;
  onRuleTypeChange: (ruleType: SubscriptionBuilderState['ruleType']) => void;
};

export function SubscriptionRuleBasicsCard({ state, onChange, onRuleTypeChange }: BasicsProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Tabs value={state.ruleType} onChange={(_, value) => onRuleTypeChange(value)}>
            {(Object.keys(ruleTypeLabels) as SubscriptionBuilderState['ruleType'][]).map((type) => (
              <Tab key={type} value={type} label={ruleTypeLabels[type]} />
            ))}
          </Tabs>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              基础信息
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              订阅在交易日数据就绪后执行。指标信号仅用于研究，不构成投资建议。
            </Typography>
          </Box>
          <TextField
            label="订阅名称"
            value={state.name}
            onChange={(event) => onChange({ name: event.target.value.slice(0, 50) })}
            helperText={`${state.name.length}/50`}
            required
            sx={{ maxWidth: 480 }}
          />
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}
              >
                执行频率
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={state.frequency}
                onChange={(_, value) => value && onChange({ frequency: value })}
              >
                <ToggleButton value="DAILY">每日</ToggleButton>
                <ToggleButton value="WEEKLY">每周</ToggleButton>
                <ToggleButton value="MONTHLY">每月</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}
              >
                创建后状态
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={state.status}
                onChange={(_, value) => value && onChange({ status: value })}
              >
                <ToggleButton value="ACTIVE">活跃</ToggleButton>
                <ToggleButton value="PAUSED">暂停</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

type UniverseProps = {
  state: SubscriptionBuilderState;
  onChange: ChangeHandler;
};

export function SubscriptionRuleUniverseCard({ state, onChange }: UniverseProps) {
  const fixedCodes = state.universe.type === 'FIXED' ? state.universe.tsCodes.join('\n') : '';
  const allA = state.universe.type === 'ALL_A' ? state.universe : null;
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            股票范围与交易约束
          </Typography>
          <TextField
            select
            label="范围"
            value={state.universe.type}
            onChange={(event) => {
              const type = event.target.value;
              if (type === 'FIXED') onChange({ universe: { type: 'FIXED', tsCodes: [] } });
              else {
                onChange({
                  universe: {
                    type: 'ALL_A',
                    excludeSt: true,
                    excludeSuspended: true,
                    excludeBse: false,
                  },
                });
              }
            }}
            sx={{ maxWidth: 300 }}
          >
            <MenuItem value="ALL_A">全 A 股</MenuItem>
            <MenuItem value="FIXED">固定股票</MenuItem>
          </TextField>
          {allA ? (
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={allA.excludeSt}
                    onChange={(event) =>
                      onChange({ universe: { ...allA, excludeSt: event.target.checked } })
                    }
                  />
                }
                label="排除 ST"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={allA.excludeSuspended}
                    onChange={(event) =>
                      onChange({ universe: { ...allA, excludeSuspended: event.target.checked } })
                    }
                  />
                }
                label="排除停牌"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={allA.excludeBse}
                    onChange={(event) =>
                      onChange({ universe: { ...allA, excludeBse: event.target.checked } })
                    }
                  />
                }
                label="排除北交所"
              />
            </Stack>
          ) : (
            <TextField
              label="股票代码"
              multiline
              minRows={3}
              value={fixedCodes}
              onChange={(event) =>
                onChange({
                  universe: { type: 'FIXED', tsCodes: normalizeTsCodes(event.target.value) },
                })
              }
              helperText="每行或逗号分隔；最多 100 只，例如 600519.SH"
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

type TriggerProps = {
  state: SubscriptionBuilderState;
  onChange: ChangeHandler;
};

export function SubscriptionRuleTriggerCard({ state, onChange }: TriggerProps) {
  const isSignal = state.ruleType === 'SIGNAL_EVENT';
  const modes = isSignal ? (['EVENT'] as const) : (['ENTER', 'EXIT', 'BOTH'] as const);
  const trigger = state.triggerSpec;
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            触发与通知
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={trigger.mode}
            onChange={(_, mode) => mode && onChange({ triggerSpec: { ...trigger, mode } })}
          >
            {modes.map((mode) => (
              <ToggleButton key={mode} value={mode}>
                {mode === 'ENTER'
                  ? '新进入'
                  : mode === 'EXIT'
                    ? '退出'
                    : mode === 'BOTH'
                      ? '进入和退出'
                      : '事件出现'}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={
                <Switch
                  checked={trigger.notifyOnInitialMatch}
                  onChange={(event) =>
                    onChange({
                      triggerSpec: { ...trigger, notifyOnInitialMatch: event.target.checked },
                    })
                  }
                />
              }
              label={isSignal ? '当天首次事件通知' : '首次执行也通知'}
            />
            {isSignal ? (
              <FormControlLabel
                control={
                  <Switch
                    checked={trigger.eventWindow === 'SINCE_LAST_SUCCESS'}
                    onChange={(event) =>
                      onChange({
                        triggerSpec: {
                          ...trigger,
                          eventWindow: event.target.checked
                            ? 'SINCE_LAST_SUCCESS'
                            : 'CURRENT_TRADE_DATE',
                        },
                      })
                    }
                  />
                }
                label="聚合上次成功执行后的交易日事件"
              />
            ) : null}
            <TextField
              size="small"
              type="number"
              label="通知摘要上限"
              value={trigger.maxHitsPerNotification}
              onChange={(event) =>
                onChange({
                  triggerSpec: {
                    ...trigger,
                    maxHitsPerNotification: Math.max(1, Math.min(Number(event.target.value), 100)),
                  },
                })
              }
              slotProps={{ htmlInput: { min: 1, max: 100 } }}
              sx={{ width: 180 }}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
