import type {
  ModelReasoningMode,
  ModelProviderDataClass,
  ModelAdapterDefinition,
} from 'src/api/model-provider';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';

import { Iconify } from 'src/components/iconify';

import {
  DATA_CLASS_OPTIONS,
  REASONING_MODE_LABELS,
  COMMON_REASONING_EFFORTS,
} from '../model-provider.constants';

import type { ModelProviderFieldErrors } from '../model-provider.validation';
import type { DeploymentDraft, DeploymentDraftUpdater } from './deployment-editor-model';

type DeploymentReasoningFieldsProps = {
  draft: DeploymentDraft;
  adapter: ModelAdapterDefinition | undefined;
  fieldErrors: ModelProviderFieldErrors;
  onUpdate: DeploymentDraftUpdater;
  onAddCustomEffort: () => void;
  onToggleDataClass: (value: ModelProviderDataClass) => void;
};

export function DeploymentReasoningFields({
  draft,
  adapter,
  fieldErrors,
  onUpdate,
  onAddCustomEffort,
  onToggleDataClass,
}: DeploymentReasoningFieldsProps) {
  const reasoningModes =
    adapter?.reasoningModes ?? (Object.keys(REASONING_MODE_LABELS) as ModelReasoningMode[]);
  const knownEfforts = Array.from(
    new Set([...(adapter?.builtInEfforts ?? COMMON_REASONING_EFFORTS), ...draft.reasoningEfforts])
  );

  return (
    <>
      <Divider />
      <Box>
        <Typography variant="subtitle2">推理控制</Typography>
        <Typography variant="caption" color="text.secondary">
          “支持的档位”与“默认运行策略”分开配置；高级原生档位保存后可按需探测。
        </Typography>
      </Box>
      <TextField
        select
        label="控制模式"
        value={draft.reasoningMode}
        onChange={(event) => onUpdate('reasoningMode', event.target.value as ModelReasoningMode)}
        slotProps={{ select: { native: true } }}
      >
        {reasoningModes.map((mode) => (
          <option key={mode} value={mode}>
            {REASONING_MODE_LABELS[mode]}
          </option>
        ))}
      </TextField>

      {draft.reasoningMode === 'EFFORT' || draft.reasoningMode === 'TOKEN_BUDGET' ? (
        <>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
              支持的推理档位
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {knownEfforts.map((effort) => {
                const selected = draft.reasoningEfforts.some(
                  (item) => item.toLowerCase() === effort.toLowerCase()
                );
                return (
                  <Chip
                    key={effort}
                    label={effort.toLowerCase()}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() =>
                      onUpdate(
                        'reasoningEfforts',
                        selected
                          ? draft.reasoningEfforts.filter(
                              (item) => item.toLowerCase() !== effort.toLowerCase()
                            )
                          : [...draft.reasoningEfforts, effort]
                      )
                    }
                    aria-pressed={selected}
                  />
                );
              })}
            </Stack>
            {fieldErrors.reasoningEfforts ? (
              <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                {fieldErrors.reasoningEfforts}
              </Typography>
            ) : null}
          </Box>
          <TextField
            select
            label="默认推理档位"
            value={draft.defaultReasoningEffort ?? ''}
            onChange={(event) => onUpdate('defaultReasoningEffort', event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
            error={Boolean(fieldErrors.defaultReasoningEffort)}
            helperText={fieldErrors.defaultReasoningEffort ?? '未显式覆盖的模型调用会采用此档位'}
          >
            <option value="">请选择推理档位</option>
            {draft.reasoningEfforts.map((effort) => (
              <option key={effort} value={effort}>
                {effort.toLowerCase()}
              </option>
            ))}
          </TextField>
        </>
      ) : null}

      {draft.reasoningMode === 'TOKEN_BUDGET' ? (
        <TextField
          type="number"
          label="推理 Token 预算"
          value={draft.reasoningBudgetTokens ?? ''}
          onChange={(event) => onUpdate('reasoningBudgetTokens', Number(event.target.value))}
          error={Boolean(fieldErrors.reasoningBudgetTokens)}
          helperText={fieldErrors.reasoningBudgetTokens ?? '仅对支持 budget_tokens 的模型生效'}
          slotProps={{ htmlInput: { min: 1, max: draft.maxOutputTokens - 1 } }}
        />
      ) : null}

      <Accordion variant="outlined" disableGutters>
        <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
          <Typography variant="subtitle2">高级：供应商原生档位</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              label="原生档位"
              name="customReasoningEffort"
              value={draft.customEffort}
              onChange={(event) => onUpdate('customEffort', event.target.value)}
              helperText="例如 vendor_ultra；如需核实供应商支持情况，可执行深度探测"
              sx={{ flex: 1 }}
              autoComplete="off"
              spellCheck={false}
            />
            <Button variant="outlined" onClick={onAddCustomEffort} sx={{ alignSelf: 'flex-start' }}>
              添加档位
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          允许处理的数据
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {DATA_CLASS_OPTIONS.map((option) => {
            const selected = draft.dataClasses.includes(option.value);
            return (
              <Chip
                key={option.value}
                label={option.label}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => onToggleDataClass(option.value)}
                aria-pressed={selected}
              />
            );
          })}
        </Stack>
      </Box>
    </>
  );
}
