import type { AgentRunStatus } from 'src/types/agent/generated';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { AgentMemoryDrawer } from './agent-memory-drawer';
import { ConversationModelControl } from './conversation-model-control';
import { AgentReportLibraryDialog } from './agent-report-library-dialog';
import { NotificationChannelSettings } from './notification-channel-settings';

import type { AgentModel } from '../hooks/use-agent-model-catalog';

type AgentShellHeaderProps = {
  mobile: boolean;
  conversationId: string | null;
  conversationTitle: string | null;
  activeRunStatus: AgentRunStatus | null;
  canConfigureModel: boolean;
  preferredModel: string | null;
  reasoningEffort: string | null;
  models: AgentModel[];
  defaultModel: string | null;
  modelLoading: boolean;
  modelLoadError: string | null;
  modelSaving: boolean;
  evidenceAvailable: boolean;
  evidencePanelOpen: boolean;
  onOpenSidebar: () => void;
  onToggleEvidence: () => void;
  onReloadModels: () => void;
  onModelSave: (preferredModel: string, reasoningEffort: string | null) => Promise<boolean>;
};

export function AgentShellHeader({
  mobile,
  conversationId,
  conversationTitle,
  activeRunStatus,
  canConfigureModel,
  preferredModel,
  reasoningEffort,
  models,
  defaultModel,
  modelLoading,
  modelLoadError,
  modelSaving,
  evidenceAvailable,
  evidencePanelOpen,
  onOpenSidebar,
  onToggleEvidence,
  onReloadModels,
  onModelSave,
}: AgentShellHeaderProps) {
  const [moreActionsAnchor, setMoreActionsAnchor] = useState<HTMLElement | null>(null);
  const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [reportLibraryOpen, setReportLibraryOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: { xs: 1, md: 3.25 },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        {mobile ? (
          <Tooltip title="会话列表">
            <IconButton aria-label="打开会话列表" onClick={onOpenSidebar}>
              <Iconify icon="solar:list-bold" width={20} />
            </IconButton>
          </Tooltip>
        ) : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            noWrap
            sx={{
              display: 'block',
              color: 'text.disabled',
              fontWeight: 700,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
            }}
          >
            Research thread{conversationId ? ` · ${conversationId}` : ''}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography component="h1" variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
              {conversationTitle ?? 'AI 量化研究'}
            </Typography>
            {activeRunStatus ? <RunStatusLabel status={activeRunStatus} /> : null}
          </Stack>
        </Box>
        <Stack direction="row" spacing={0.25} alignItems="center">
          {mobile ? (
            <Tooltip title="更多研究操作">
              <IconButton
                aria-label="更多研究操作"
                onClick={(event) => setMoreActionsAnchor(event.currentTarget)}
              >
                <Iconify icon="solar:menu-dots-bold" width={20} />
              </IconButton>
            </Tooltip>
          ) : (
            <>
              <Tooltip title="管理长期记忆">
                <IconButton
                  aria-label="管理长期记忆"
                  onClick={() => setMemoryDrawerOpen(true)}
                  sx={headerActionSx}
                >
                  <Iconify icon="solar:notebook-bookmark-bold" width={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="管理通知渠道">
                <IconButton
                  aria-label="管理通知渠道"
                  onClick={() => setNotificationSettingsOpen(true)}
                  sx={headerActionSx}
                >
                  <Iconify icon="solar:bell-bing-bold" width={20} />
                </IconButton>
              </Tooltip>
              <Tooltip title="查看研究报告">
                <IconButton
                  aria-label="查看研究报告"
                  onClick={() => setReportLibraryOpen(true)}
                  sx={headerActionSx}
                >
                  <Iconify icon="solar:document-text-bold" width={20} />
                </IconButton>
              </Tooltip>
            </>
          )}
          {evidenceAvailable ? (
            <Tooltip title={evidencePanelOpen ? '关闭证据面板' : '查看证据面板'}>
              <IconButton
                aria-label={evidencePanelOpen ? '关闭证据面板' : '查看证据面板'}
                onClick={onToggleEvidence}
                sx={headerActionSx}
              >
                <Iconify icon="solar:file-text-bold" width={20} />
              </IconButton>
            </Tooltip>
          ) : null}
          {!mobile && canConfigureModel ? (
            <ConversationModelControl
              preferredModel={preferredModel}
              reasoningEffort={reasoningEffort}
              models={models}
              defaultModel={defaultModel}
              loading={modelLoading}
              loadError={modelLoadError}
              saving={modelSaving}
              onReloadModels={onReloadModels}
              onSave={onModelSave}
            />
          ) : null}
        </Stack>
      </Box>

      <Menu
        anchorEl={moreActionsAnchor}
        open={Boolean(moreActionsAnchor)}
        onClose={() => setMoreActionsAnchor(null)}
      >
        {canConfigureModel ? (
          <ConversationModelControl
            trigger="menu-item"
            preferredModel={preferredModel}
            reasoningEffort={reasoningEffort}
            models={models}
            defaultModel={defaultModel}
            loading={modelLoading}
            loadError={modelLoadError}
            saving={modelSaving}
            onTrigger={() => setMoreActionsAnchor(null)}
            onReloadModels={onReloadModels}
            onSave={onModelSave}
          />
        ) : null}
        <MenuItem
          onClick={() => {
            setMoreActionsAnchor(null);
            setMemoryDrawerOpen(true);
          }}
          sx={{ minWidth: 196, gap: 1 }}
        >
          <Iconify icon="solar:notebook-bookmark-bold" width={18} />
          管理长期记忆
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMoreActionsAnchor(null);
            setNotificationSettingsOpen(true);
          }}
          sx={{ gap: 1 }}
        >
          <Iconify icon="solar:bell-bing-bold" width={18} />
          管理通知渠道
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMoreActionsAnchor(null);
            setReportLibraryOpen(true);
          }}
          sx={{ gap: 1 }}
        >
          <Iconify icon="solar:document-text-bold" width={18} />
          查看研究报告
        </MenuItem>
      </Menu>

      <AgentMemoryDrawer open={memoryDrawerOpen} onClose={() => setMemoryDrawerOpen(false)} />
      <NotificationChannelSettings
        open={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />
      <AgentReportLibraryDialog
        open={reportLibraryOpen}
        onClose={() => setReportLibraryOpen(false)}
      />
    </>
  );
}

function RunStatusLabel({ status }: { status: AgentRunStatus }) {
  const color =
    status === 'FAILED'
      ? 'error'
      : status === 'CANCELLED'
        ? 'warning'
        : status === 'COMPLETED'
          ? 'success'
          : 'info';
  const label =
    status === 'FAILED'
      ? '研究失败'
      : status === 'CANCELLED'
        ? '已停止'
        : status === 'COMPLETED'
          ? '已完成'
          : '研究中';

  return (
    <Label variant="soft" color={color}>
      {label}
    </Label>
  );
}

const headerActionSx = {
  width: 36,
  height: 36,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'action.hover',
  '&:hover': { bgcolor: 'action.selected' },
};
