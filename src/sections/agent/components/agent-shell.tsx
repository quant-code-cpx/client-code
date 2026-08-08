import type { ModelPolicy } from 'src/types/agent/generated';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useRouter } from 'src/routes/hooks';

import { agentApi } from 'src/api/agent';
import { useSyncNotification } from 'src/contexts/sync-notification-context';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { Composer } from './composer';
import { EvidenceRail } from './evidence-rail';
import { RunStatusBar } from './run-status-bar';
import { MessageViewport } from './message-viewport';
import { useAgentRun } from '../hooks/use-agent-run';
import { AgentMemoryDrawer } from './agent-memory-drawer';
import { useConversation } from '../hooks/use-conversation';
import { ConversationSidebar } from './conversation-sidebar';
import { useComposerDraft } from '../hooks/use-composer-draft';
import { TERMINAL_RUN_STATUSES } from '../state/agent-state.types';
import { useConversationList } from '../hooks/use-conversation-list';
import { AgentMuiXProvider } from './mui-x-chat/agent-mui-x-provider';
import { ConversationModelControl } from './conversation-model-control';
import { AgentReportPreviewDialog } from './agent-report-preview-dialog';
import { AgentReportLibraryDialog } from './agent-report-library-dialog';
import { useAgentState, useAgentDispatch } from '../state/agent-provider';
import { NotificationChannelSettings } from './notification-channel-settings';
import { toChatMessages, toChatConversations } from './mui-x-chat/agent-chat-mappers';

import type { AgentComposerModel } from '../state/agent-state.types';

const DEFAULT_NEW_CONVERSATION_MODEL: AgentComposerModel = {
  policy: 'AUTO',
  preferredModel: null,
};

export function AgentShell() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const state = useAgentState();
  const dispatch = useAgentDispatch();
  const { lastAgentRunUpdate } = useSyncNotification();
  const handledSocketUpdateRef = useRef('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationQuery, setConversationQuery] = useState('');
  const [moreActionsAnchor, setMoreActionsAnchor] = useState<HTMLElement | null>(null);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [evidenceDismissed, setEvidenceDismissed] = useState(false);
  const [memoryDrawerOpen, setMemoryDrawerOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [reportPreviewRunId, setReportPreviewRunId] = useState<string | null>(null);
  const [reportLibraryOpen, setReportLibraryOpen] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelNotice, setModelNotice] = useState<{
    severity: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [newConversationModel, setNewConversationModel] = useState<AgentComposerModel>(
    DEFAULT_NEW_CONVERSATION_MODEL
  );
  const conversationId = state.currentConversationId;
  const conversationList = useConversationList();
  const conversationState = useConversation(conversationId);
  const run = useAgentRun(conversationId, newConversationModel);
  const draft = useComposerDraft(conversationId ?? 'new');
  const isRunning = Boolean(run.activeRun && !TERMINAL_RUN_STATUSES.has(run.activeRun.status));
  const pageError = conversationState.loadState?.detailStatus === 'error';
  const wideEvidence = useMediaQuery('(min-width:1720px)');
  const activeConversationIds = useMemo(
    () => Object.keys(state.runs.activeRunIdByConversation),
    [state.runs.activeRunIdByConversation]
  );
  const backgroundRunKey = useMemo(
    () =>
      Object.entries(state.runs.activeRunIdByConversation)
        .filter(([id]) => id !== conversationId)
        .map(([id, runId]) => `${id}:${runId}`)
        .sort()
        .join('|'),
    [conversationId, state.runs.activeRunIdByConversation]
  );
  const messageCountByConversation = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.messages.orderedIdsByConversation).map(([id, messageIds]) => [
          id,
          messageIds.length,
        ])
      ),
    [state.messages.orderedIdsByConversation]
  );
  const visibleConversations = useMemo(() => {
    const normalizedQuery = conversationQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) return conversationList.items;
    return conversationList.items.filter((item) =>
      item.title.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [conversationList.items, conversationQuery]);
  const projectedConversations = useMemo(
    () =>
      toChatConversations(visibleConversations, {
        activeConversationIds: new Set(activeConversationIds),
        staleConversationIds: new Set(state.staleConversationIds),
        messageCountByConversation,
      }),
    [activeConversationIds, messageCountByConversation, state.staleConversationIds, visibleConversations]
  );
  const projectedMessages = useMemo(
    () => toChatMessages(pageError ? [] : conversationState.messages),
    [conversationState.messages, pageError]
  );
  const evidenceMessage = useMemo(
    () =>
      [...conversationState.messages]
        .reverse()
        .find((message) => message.role === 'ASSISTANT' && message.citations.length > 0) ?? null,
    [conversationState.messages]
  );

  useEffect(() => {
    setEvidenceDismissed(false);
  }, [evidenceMessage?.messageId]);

  useEffect(() => {
    if (!lastAgentRunUpdate) return;
    const updateKey = `${lastAgentRunUpdate.runId}:${lastAgentRunUpdate.updatedAt}`;
    if (handledSocketUpdateRef.current === updateKey) return;
    handledSocketUpdateRef.current = updateKey;

    const updatedRun = state.runs.byId[lastAgentRunUpdate.runId];
    if (!updatedRun) return;
    dispatch({ type: 'CONVERSATION_INVALIDATED', conversationId: updatedRun.conversationId });
    if (updatedRun.conversationId === conversationId) {
      run.continueReceiving();
      return;
    }
    void agentApi
      .getRunStatus({ runId: updatedRun.runId })
      .then((snapshot) =>
        dispatch({
          type: 'RUN_STATUS_RECEIVED',
          snapshot,
          assistantMessageId: updatedRun.assistantMessageId,
        })
      )
      .catch(() => undefined);
  }, [conversationId, dispatch, lastAgentRunUpdate, run, state.runs.byId]);

  useEffect(() => {
    if (!backgroundRunKey) return undefined;
    const targets = backgroundRunKey.split('|').map((entry) => {
      const separator = entry.indexOf(':');
      return { conversationId: entry.slice(0, separator), runId: entry.slice(separator + 1) };
    });
    const reconcile = () => {
      for (const target of targets) {
        void agentApi
          .getRunStatus({ runId: target.runId })
          .then((snapshot) => {
            dispatch({ type: 'RUN_STATUS_RECEIVED', snapshot });
            if (TERMINAL_RUN_STATUSES.has(snapshot.status)) {
              dispatch({ type: 'CONVERSATION_INVALIDATED', conversationId: target.conversationId });
            }
          })
          .catch(() => undefined);
      }
    };
    reconcile();
    const intervalId = window.setInterval(reconcile, 15_000);
    return () => window.clearInterval(intervalId);
  }, [backgroundRunKey, dispatch]);

  const handleSubmit = useCallback(async () => {
    const accepted = await run.send(draft.value);
    if (accepted) draft.clear();
  }, [draft, run]);

  const handleSelect = useCallback(
    (nextConversationId: string) => {
      setSidebarOpen(false);
      dispatch({ type: 'CONVERSATION_SELECTED', conversationId: nextConversationId });
      router.push(`/agent/${nextConversationId}`);
    },
    [dispatch, router]
  );

  const handleNew = useCallback(() => {
    setSidebarOpen(false);
    setNewConversationModel(DEFAULT_NEW_CONVERSATION_MODEL);
    dispatch({ type: 'CONVERSATION_SELECTED', conversationId: null });
    router.push('/agent');
  }, [dispatch, router]);

  const handleModelSave = useCallback(
    async (policy: ModelPolicy, preferredModel: string | null) => {
      if (!conversationId) {
        const nextPreferredModel = policy === 'MANUAL' ? preferredModel : null;
        setNewConversationModel({ policy, preferredModel: nextPreferredModel });
        setModelError(null);
        setModelNotice({
          severity: 'success',
          message:
            policy === 'MANUAL'
              ? `已选择 ${nextPreferredModel ?? '指定模型'}；首条消息将使用此模型。`
              : '已选择自动模型；首条消息将由系统自动选择模型。',
        });
        return true;
      }
      setModelSaving(true);
      setModelError(null);
      setModelNotice(null);
      try {
        const response = await agentApi.updateConversationModel({
          conversationId,
          modelPolicy: policy,
          preferredModel,
        });
        const preparation = response.contextPreparation;
        setModelNotice({
          severity:
            preparation.status === 'READY'
              ? 'success'
              : preparation.status === 'COMPACTION_REQUIRED'
                ? 'warning'
                : 'error',
          message:
            preparation.status === 'INCOMPATIBLE'
              ? `模型已更新，但当前会话与 ${preparation.targetModel} 不兼容：${preparation.message}`
              : `模型已更新为 ${preparation.targetModel}。${preparation.message}`,
        });
        await conversationState.refresh();
        return true;
      } catch (error) {
        setModelError(error instanceof Error ? error.message : '模型偏好保存失败');
        return false;
      } finally {
        setModelSaving(false);
      }
    },
    [conversationId, conversationState]
  );

  const selectedModelPolicy =
    conversationState.conversation?.modelPolicy ?? newConversationModel.policy;
  const selectedPreferredModel =
    conversationState.conversation?.preferredModel ?? newConversationModel.preferredModel;
  const canConfigureModel = Boolean(conversationState.conversation) || !conversationId;

  const evidenceVisible = Boolean(evidenceMessage) && !evidenceDismissed;
  const evidencePanelOpen = wideEvidence ? evidenceVisible : evidenceDrawerOpen;
  const handleReportSaved = useCallback(() => {
    setReportPreviewRunId(null);
    setReportNotice('研究报告已保存，正在异步生成归档文件。');
  }, []);

  return (
    <AgentMuiXProvider
      activeConversationId={conversationId}
      composerValue={draft.value}
      conversations={projectedConversations}
      messages={projectedMessages}
      hasOlder={!pageError && conversationState.hasOlder}
      onActiveConversationChange={handleSelect}
      onComposerValueChange={draft.setValue}
    >
      <Box
        sx={{
          minHeight: 0,
          height: 1,
          display: 'flex',
          overflow: 'hidden',
          color: 'text.primary',
          bgcolor: 'background.default',
        }}
      >
        <ConversationSidebar
          totalItemCount={conversationList.items.length}
          visibleItemCount={visibleConversations.length}
          query={conversationQuery}
          status={conversationList.status}
          error={conversationList.error}
          hasMore={conversationList.hasMore}
          loadingMore={conversationList.loadingMore}
          mobileOpen={sidebarOpen}
          mobile={mobile}
          onClose={() => setSidebarOpen(false)}
          onNew={handleNew}
          onQueryChange={setConversationQuery}
          onRetry={conversationList.refresh}
          onLoadMore={conversationList.loadMore}
        />

        <Box
          component="main"
          sx={{ minWidth: 0, minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
        >
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
                <IconButton aria-label="打开会话列表" onClick={() => setSidebarOpen(true)}>
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
                  {conversationState.conversation?.title ?? 'AI 量化研究'}
                </Typography>
                {run.activeRun ? (
                  <Label
                    variant="soft"
                    color={
                      run.activeRun.status === 'FAILED'
                        ? 'error'
                        : run.activeRun.status === 'CANCELLED'
                          ? 'warning'
                          : run.activeRun.status === 'COMPLETED'
                            ? 'success'
                            : 'info'
                    }
                  >
                    {run.activeRun.status === 'FAILED'
                      ? '研究失败'
                      : run.activeRun.status === 'CANCELLED'
                        ? '已停止'
                        : run.activeRun.status === 'COMPLETED'
                          ? '已完成'
                          : '研究中'}
                  </Label>
                ) : null}
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
              {evidenceMessage ? (
                <Tooltip title={evidencePanelOpen ? '关闭证据面板' : '查看证据面板'}>
                  <IconButton
                    aria-label={evidencePanelOpen ? '关闭证据面板' : '查看证据面板'}
                    onClick={() => {
                      if (wideEvidence) setEvidenceDismissed((value) => !value);
                      else setEvidenceDrawerOpen((value) => !value);
                    }}
                    sx={headerActionSx}
                  >
                    <Iconify icon="solar:file-text-bold" width={20} />
                  </IconButton>
                </Tooltip>
              ) : null}
              {!mobile && canConfigureModel ? (
                <ConversationModelControl
                  policy={selectedModelPolicy}
                  preferredModel={selectedPreferredModel}
                  saving={modelSaving}
                  onSave={handleModelSave}
                />
              ) : null}
            </Stack>
          </Box>

          {modelError ? (
            <Alert severity="error" onClose={() => setModelError(null)} sx={{ borderRadius: 0 }}>
              {modelError}
            </Alert>
          ) : null}
          {modelNotice ? (
            <Alert
              severity={modelNotice.severity}
              role={modelNotice.severity === 'error' ? 'alert' : 'status'}
              aria-live={modelNotice.severity === 'error' ? 'assertive' : 'polite'}
              onClose={() => setModelNotice(null)}
              sx={{ borderRadius: 0 }}
            >
              {modelNotice.message}
            </Alert>
          ) : null}
          {reportNotice ? (
            <Alert
              severity="success"
              onClose={() => setReportNotice(null)}
              sx={{ borderRadius: 0 }}
            >
              {reportNotice}
            </Alert>
          ) : null}

          <RunStatusBar run={run.activeRun} onContinue={run.continueReceiving} />

          {pageError ? (
            <MessageViewport
              messages={[]}
              activeRun={run.activeRun}
              runsById={state.runs.byId}
              status="error"
              error={conversationState.loadState?.error ?? '会话不存在或无权访问'}
              hasOlder={false}
              onLoadOlder={conversationState.loadOlder}
              onRetryLoad={conversationState.refresh}
              onRegenerate={run.regenerate}
              onRetryMessage={run.retryUnsent}
              onSaveReport={setReportPreviewRunId}
              onContinue={run.continueReceiving}
            />
          ) : (
            <MessageViewport
              messages={conversationState.messages}
              activeRun={run.activeRun}
              runsById={state.runs.byId}
              status={conversationState.loadState?.messagesStatus ?? 'ready'}
              error={conversationState.loadState?.error ?? null}
              hasOlder={conversationState.hasOlder}
              onLoadOlder={conversationState.loadOlder}
              onRetryLoad={conversationState.refresh}
              onRegenerate={run.regenerate}
              onRetryMessage={run.retryUnsent}
              onSaveReport={setReportPreviewRunId}
              onContinue={run.continueReceiving}
            />
          )}

          {!pageError ? (
            <Composer
              value={draft.value}
              recovered={draft.recovered}
              isSending={run.isSending}
              isRunning={isRunning}
              stopping={run.activeRun?.cancelRequested ?? false}
              error={run.commandError}
              onSubmit={handleSubmit}
              onStop={run.cancel}
            />
          ) : null}
        </Box>

        {wideEvidence && evidenceMessage && evidenceVisible ? (
          <EvidenceRail message={evidenceMessage} onClose={() => setEvidenceDismissed(true)} />
        ) : null}

        {!wideEvidence && evidenceMessage ? (
          <Drawer
            anchor="right"
            open={evidenceDrawerOpen}
            onClose={() => setEvidenceDrawerOpen(false)}
            slotProps={{
              paper: {
                sx: {
                  width: 360,
                  maxWidth: '90vw',
                  overscrollBehavior: 'contain',
                  color: 'text.primary',
                  bgcolor: 'background.default',
                },
              },
            }}
          >
            <EvidenceRail
              message={evidenceMessage}
              drawer
              onClose={() => setEvidenceDrawerOpen(false)}
            />
          </Drawer>
        ) : null}
        <Menu
          anchorEl={moreActionsAnchor}
          open={Boolean(moreActionsAnchor)}
          onClose={() => setMoreActionsAnchor(null)}
        >
          {canConfigureModel ? (
            <ConversationModelControl
              trigger="menu-item"
              policy={selectedModelPolicy}
              preferredModel={selectedPreferredModel}
              saving={modelSaving}
              onTrigger={() => setMoreActionsAnchor(null)}
              onSave={handleModelSave}
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
        <AgentReportPreviewDialog
          open={reportPreviewRunId !== null}
          runId={reportPreviewRunId}
          onClose={() => setReportPreviewRunId(null)}
          onSaved={handleReportSaved}
        />
        <AgentReportLibraryDialog
          open={reportLibraryOpen}
          onClose={() => setReportLibraryOpen(false)}
        />
      </Box>
    </AgentMuiXProvider>
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
