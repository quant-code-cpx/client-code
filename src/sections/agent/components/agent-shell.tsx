import type { ModelPolicy } from 'src/types/agent/generated';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useRouter } from 'src/routes/hooks';

import { agentApi } from 'src/api/agent';
import { useSyncNotification } from 'src/contexts/sync-notification-context';

import { Iconify } from 'src/components/iconify';
import { PageHeader } from 'src/components/page-header';

import { Composer } from './composer';
import { RunStatusBar } from './run-status-bar';
import { MessageViewport } from './message-viewport';
import { useAgentRun } from '../hooks/use-agent-run';
import { useConversation } from '../hooks/use-conversation';
import { ConversationSidebar } from './conversation-sidebar';
import { useComposerDraft } from '../hooks/use-composer-draft';
import { TERMINAL_RUN_STATUSES } from '../state/agent-state.types';
import { useConversationList } from '../hooks/use-conversation-list';
import { ConversationModelControl } from './conversation-model-control';
import { useAgentState, useAgentDispatch } from '../state/agent-provider';

export function AgentShell() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const state = useAgentState();
  const dispatch = useAgentDispatch();
  const { lastAgentRunUpdate } = useSyncNotification();
  const handledSocketUpdateRef = useRef('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const conversationId = state.currentConversationId;
  const conversationList = useConversationList();
  const conversationState = useConversation(conversationId);
  const run = useAgentRun(conversationId);
  const draft = useComposerDraft(conversationId ?? 'new');
  const isRunning = Boolean(run.activeRun && !TERMINAL_RUN_STATUSES.has(run.activeRun.status));

  useEffect(() => {
    if (!lastAgentRunUpdate) return;
    const updateKey = `${lastAgentRunUpdate.runId}:${lastAgentRunUpdate.updatedAt}`;
    if (handledSocketUpdateRef.current === updateKey) return;
    handledSocketUpdateRef.current = updateKey;

    const updatedRun = state.runs.byId[lastAgentRunUpdate.runId];
    if (!updatedRun) return;
    dispatch({ type: 'CONVERSATION_INVALIDATED', conversationId: updatedRun.conversationId });
    if (updatedRun.conversationId === conversationId) run.continueReceiving();
  }, [conversationId, dispatch, lastAgentRunUpdate, run, state.runs.byId]);

  const handleSubmit = useCallback(async () => {
    const accepted = await run.send(draft.value);
    if (accepted) draft.clear();
  }, [draft, run]);

  const handleSelect = useCallback(
    (_nextConversationId: string) => {
      setSidebarOpen(false);
    },
    []
  );

  const handleNew = useCallback(() => {
    setSidebarOpen(false);
    dispatch({ type: 'CONVERSATION_SELECTED', conversationId: null });
    router.push('/agent');
  }, [dispatch, router]);

  const handleModelSave = useCallback(
    async (policy: ModelPolicy, preferredModel: string | null) => {
      if (!conversationId) return false;
      setModelSaving(true);
      setModelError(null);
      try {
        await agentApi.updateConversationModel({
          conversationId,
          modelPolicy: policy,
          preferredModel,
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

  const activeConversationIds = Object.keys(state.runs.activeRunIdByConversation);
  const pageError = conversationState.loadState?.detailStatus === 'error';

  return (
    <Box
      sx={{
        minHeight: 0,
        height: 1,
        display: 'flex',
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <ConversationSidebar
        items={conversationList.items}
        currentConversationId={conversationId}
        status={conversationList.status}
        error={conversationList.error}
        hasMore={conversationList.hasMore}
        loadingMore={conversationList.loadingMore}
        mobileOpen={sidebarOpen}
        mobile={mobile}
        activeConversationIds={activeConversationIds}
        staleConversationIds={state.staleConversationIds}
        onClose={() => setSidebarOpen(false)}
        onNew={handleNew}
        onSelect={handleSelect}
        onRetry={conversationList.refresh}
        onLoadMore={conversationList.loadMore}
      />

      <Box component="main" sx={{ minWidth: 0, minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: { xs: 1.5, md: 3 }, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <PageHeader
            variant="h5"
            title={conversationState.conversation?.title ?? 'AI 量化研究'}
            description={
              conversationId
                ? `${conversationState.conversation?.messageCount ?? 0} 条消息`
                : '新建研究'
            }
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                {mobile ? (
                  <Tooltip title="会话列表">
                    <IconButton aria-label="打开会话列表" onClick={() => setSidebarOpen(true)}>
                      <Iconify icon="solar:list-bold" width={20} />
                    </IconButton>
                  </Tooltip>
                ) : null}
                {conversationState.conversation ? (
                  <ConversationModelControl
                    policy={conversationState.conversation.modelPolicy}
                    preferredModel={conversationState.conversation.preferredModel ?? null}
                    saving={modelSaving}
                    onSave={handleModelSave}
                  />
                ) : null}
              </Stack>
            }
          />
        </Box>

        {modelError ? (
          <Alert severity="error" onClose={() => setModelError(null)} sx={{ borderRadius: 0 }}>
            {modelError}
          </Alert>
        ) : null}

        <RunStatusBar run={run.activeRun} onContinue={run.continueReceiving} />

        {pageError ? (
          <MessageViewport
            messages={[]}
            status="error"
            error={conversationState.loadState?.error ?? '会话不存在或无权访问'}
            hasOlder={false}
            onLoadOlder={conversationState.loadOlder}
            onRetryLoad={conversationState.refresh}
            onRegenerate={run.regenerate}
            onRetryMessage={run.retryUnsent}
          />
        ) : (
          <MessageViewport
            messages={conversationState.messages}
            status={conversationState.loadState?.messagesStatus ?? 'ready'}
            error={conversationState.loadState?.error ?? null}
            hasOlder={conversationState.hasOlder}
            onLoadOlder={conversationState.loadOlder}
            onRetryLoad={conversationState.refresh}
            onRegenerate={run.regenerate}
            onRetryMessage={run.retryUnsent}
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
            onChange={draft.setValue}
            onSubmit={handleSubmit}
            onStop={run.cancel}
          />
        ) : null}
      </Box>
    </Box>
  );
}
