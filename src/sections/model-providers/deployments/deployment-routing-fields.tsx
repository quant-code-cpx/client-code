import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';

import { Iconify } from 'src/components/iconify';

import { blurDeploymentNumberInputOnWheel } from './deployment-number-input';

import type { DeploymentDraft, DeploymentDraftUpdater } from './deployment-editor-model';

type DeploymentRoutingFieldsProps = {
  draft: DeploymentDraft;
  onUpdate: DeploymentDraftUpdater;
};

export function DeploymentRoutingFields({ draft, onUpdate }: DeploymentRoutingFieldsProps) {
  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
        <Typography variant="subtitle2">运行与路由参数</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <TextField
            label="上下文窗口"
            type="number"
            value={draft.contextWindow}
            onChange={(event) => onUpdate('contextWindow', Number(event.target.value))}
            slotProps={{ htmlInput: { onWheel: blurDeploymentNumberInputOnWheel } }}
          />
          <TextField
            label="最大输出"
            type="number"
            value={draft.maxOutputTokens}
            onChange={(event) => onUpdate('maxOutputTokens', Number(event.target.value))}
            slotProps={{ htmlInput: { onWheel: blurDeploymentNumberInputOnWheel } }}
          />
          <TextField
            label="优先级"
            type="number"
            value={draft.priority}
            onChange={(event) => onUpdate('priority', Number(event.target.value))}
            helperText="数字越小越优先"
            slotProps={{ htmlInput: { onWheel: blurDeploymentNumberInputOnWheel } }}
          />
          <TextField
            select
            label="成本层级"
            value={draft.costTier}
            onChange={(event) =>
              onUpdate('costTier', event.target.value as DeploymentDraft['costTier'])
            }
            slotProps={{ select: { native: true } }}
          >
            <option value="LOW">低成本</option>
            <option value="MEDIUM">均衡</option>
            <option value="HIGH">高性能</option>
          </TextField>
          <TextField
            label="单次模型调用超时（毫秒）"
            type="number"
            value={draft.timeoutMs}
            onChange={(event) => onUpdate('timeoutMs', Number(event.target.value))}
            helperText="整条研究时限会按工作流阶段与重试预算自动计算"
            slotProps={{ htmlInput: { onWheel: blurDeploymentNumberInputOnWheel } }}
          />
          <TextField
            label="最大重试"
            type="number"
            value={draft.maxRetries}
            onChange={(event) => onUpdate('maxRetries', Number(event.target.value))}
            helperText="作用于每次模型请求"
            slotProps={{ htmlInput: { onWheel: blurDeploymentNumberInputOnWheel } }}
          />
          <TextField
            label="重试基数（毫秒）"
            type="number"
            value={draft.retryBaseMs}
            onChange={(event) => onUpdate('retryBaseMs', Number(event.target.value))}
            slotProps={{ htmlInput: { onWheel: blurDeploymentNumberInputOnWheel } }}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
