import type { ModelConnection, ModelProviderCapability } from 'src/api/model-provider';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { CAPABILITY_OPTIONS } from '../model-provider.constants';

import type { ModelProviderFieldErrors } from '../model-provider.validation';
import type { DeploymentDraft, DeploymentDraftUpdater } from './deployment-editor-model';

type DeploymentConnectionFieldsProps = {
  draft: DeploymentDraft;
  connection: ModelConnection | undefined;
  connections: ModelConnection[];
  fieldErrors: ModelProviderFieldErrors;
  onUpdate: DeploymentDraftUpdater;
  onChangeConnection: (connectionId: string) => void;
  onToggleCapability: (value: ModelProviderCapability) => void;
};

export function DeploymentConnectionFields({
  draft,
  connection,
  connections,
  fieldErrors,
  onUpdate,
  onChangeConnection,
  onToggleCapability,
}: DeploymentConnectionFieldsProps) {
  return (
    <>
      <TextField
        select
        label="供应商连接"
        value={draft.connectionId}
        onChange={(event) => onChangeConnection(event.target.value)}
        slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
        error={Boolean(fieldErrors.connectionId)}
        helperText={
          fieldErrors.connectionId ??
          (connection?.enabled ? '连接已启用' : '连接尚未启用，部署只能保存为草稿')
        }
        required
      >
        <option value="" disabled>
          请选择连接
        </option>
        {connections.map((item) => (
          <option key={item.id} value={item.id}>
            {item.displayName} · {item.adapterKind}
          </option>
        ))}
      </TextField>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        <TextField
          label="模型 ID"
          name="modelId"
          value={draft.modelId}
          onChange={(event) => onUpdate('modelId', event.target.value)}
          error={Boolean(fieldErrors.modelId)}
          helperText={fieldErrors.modelId ?? '支持 gpt-5.6-sol、openai/gpt-* 等安全标点'}
          required
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <TextField
          label="显示名称"
          name="deploymentDisplayName"
          value={draft.displayName}
          onChange={(event) => onUpdate('displayName', event.target.value)}
          error={Boolean(fieldErrors.displayName)}
          helperText={fieldErrors.displayName ?? 'Agent 工作台中展示的名称'}
          required
          autoComplete="off"
        />
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          能力声明
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {CAPABILITY_OPTIONS.map((option) => {
            const selected = draft.capabilities.includes(option.value);
            return (
              <Chip
                key={option.value}
                label={option.label}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => onToggleCapability(option.value)}
                aria-pressed={selected}
                icon={
                  <Iconify
                    icon={selected ? 'solar:check-circle-bold' : 'solar:info-circle-bold'}
                    width={18}
                    aria-hidden="true"
                  />
                }
              />
            );
          })}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
          这里由管理员声明模型能力，不受适配器预设限制；若供应商实际不支持，调用时会返回明确提示。
        </Typography>
        {fieldErrors.capabilities ? (
          <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
            {fieldErrors.capabilities}
          </Typography>
        ) : null}
      </Box>
    </>
  );
}
