import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Drawer from '@mui/material/Drawer';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useRouter } from 'src/routes/hooks';

import { agentApi } from 'src/api/agent';
import { useSyncNotification } from 'src/contexts/sync-notification-context';

import { Composer } from './composer';
import { EvidenceRail } from './evidence-rail';
import { RunStatusBar } from './run-status-bar';
import { MessageViewport } from './message-viewport';
import { useAgentRun } from '../hooks/use-agent-run';
import { AgentShellHeader } from './agent-shell-header';
import { useConversation } from '../hooks/use-conversation';
import { ConversationSidebar } from './conversation-sidebar';
import { useComposerDraft } from '../hooks/use-composer-draft';
import { TERMINAL_RUN_STATUSES } from '../state/agent-state.types';
import { useConversationList } from '../hooks/use-conversation-list';
import { formatReasoningEffort } from './conversation-model-control';
import { AgentMuiXProvider } from './mui-x-chat/agent-mui-x-provider';
import { useAgentModelCatalog } from '../hooks/use-agent-model-catalog';
import { selectIsHistoricalBranchView } from '../state/agent-selectors';
import { AgentReportPreviewDialog } from './agent-report-preview-dialog';
import { useAgentState, useAgentDispatch } from '../state/agent-provider';
import { toChatMessages, toChatConversations } from './mui-x-chat/agent-chat-mappers';

import type { AgentComposerModel } from '../state/agent-state.types';

const DEFAULT_NEW_CONVERSATION_MODEL: AgentComposerModel = {
  preferredModel: null,
  reasoningEffort: null,
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
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [evidenceDismissed, setEvidenceDismissed] = useState(false);
  const [reportPreviewRunId, setReportPreviewRunId] = useState<string | null>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError] = useState<{
    selectionGeneration: number;
    message: string;
  } | null>(null);
  const [modelNotice, setModelNotice] = useState<{
    selectionGeneration: number;
    severity: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [newConversationModel, setNewConversationModel] = useState<AgentComposerModel>(
    DEFAULT_NEW_CONVERSATION_MODEL
  );
  const conversationId = state.currentConversationId;
  const conversationList = useConversationList();
  const conversationState = useConversation(conversationId);
  const {
    items: models,
    defaultModel,
    loading: modelsLoading,
    error: modelsError,
    reload: reloadModels,
    rememberModel,
  } = useAgentModelCatalog();
  const effectiveNewConversationModel = useMemo<AgentComposerModel>(
    () => ({
      ...newConversationModel,
      preferredModel: newConversationModel.preferredModel ?? defaultModel,
    }),
    [defaultModel, newConversationModel]
  );
  const run = useAgentRun(conversationId, effectiveNewConversationModel);
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
    [
      activeConversationIds,
      messageCountByConversation,
      state.staleConversationIds,
      visibleConversations,
    ]
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
    async (preferredModel: string, reasoningEffort: string | null) => {
      if (!conversationId) {
        setNewConversationModel({
          preferredModel,
          reasoningEffort,
        });
        rememberModel(preferredModel);
        setModelError(null);
        setModelNotice({
          selectionGeneration: state.selectionGeneration,
          severity: 'success',
          message: `已选择 ${preferredModel}${reasoningEffort ? ` · ${formatReasoningEffort(reasoningEffort)}` : ''}；首条消息将使用此配置。`,
        });
        return true;
      }
      setModelSaving(true);
      setModelError(null);
      setModelNotice(null);
      try {
        const response = await agentApi.updateConversationModel({
          conversationId,
          modelPolicy: 'MANUAL',
          preferredModel,
          reasoningEffort,
        });
        rememberModel(preferredModel);
        const preparation = response.contextPreparation;
        setModelNotice({
          selectionGeneration: state.selectionGeneration,
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
        setModelError({
          selectionGeneration: state.selectionGeneration,
          message: error instanceof Error ? error.message : '模型偏好保存失败',
        });
        return false;
      } finally {
        setModelSaving(false);
      }
    },
    [conversationId, conversationState, rememberModel, state.selectionGeneration]
  );

  const visibleModelError =
    modelError?.selectionGeneration === state.selectionGeneration ? modelError : null;
  const visibleModelNotice =
    modelNotice?.selectionGeneration === state.selectionGeneration ? modelNotice : null;

  const selectedPreferredModel = conversationState.conversation
    ? conversationState.conversation.preferredModel
    : effectiveNewConversationModel.preferredModel;
  const selectedReasoningEffort = conversationState.conversation
    ? (conversationState.conversation.reasoningEffort ?? null)
    : effectiveNewConversationModel.reasoningEffort;
  const canConfigureModel = Boolean(conversationState.conversation) || !conversationId;
  const selectedCatalogModel = models.find((model) => model.model === selectedPreferredModel);
  const modelBlockedReason = modelsLoading
    ? '正在加载可用模型…'
    : modelsError
      ? `无法验证当前模型：${modelsError}`
      : !selectedPreferredModel
        ? '暂无可用模型，请先配置模型供应商。'
        : !selectedCatalogModel
          ? '当前会话模型已不在可用目录，请切换模型。'
          : selectedCatalogModel.status !== 'AVAILABLE'
            ? (selectedCatalogModel.reason ?? '当前会话模型暂不可用，请切换模型。')
            : null;
  const viewingHistoricalBranch = selectIsHistoricalBranchView(conversationState.branchProjection);
  const branchBlockedReason = conversationState.branchChanging
    ? '正在切换回答版本，请稍候…'
    : viewingHistoricalBranch && conversationState.branchProjection
      ? conversationState.branchProjection.canAdoptDisplay
        ? '当前正在查看历史版本；请先选择“从此版本继续”或回到最新。'
        : '当前历史版本不可继续；请先回到最新。'
      : null;

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
          <AgentShellHeader
            mobile={mobile}
            conversationId={conversationId}
            conversationTitle={conversationState.conversation?.title ?? null}
            activeRunStatus={run.activeRun?.status ?? null}
            canConfigureModel={canConfigureModel}
            preferredModel={selectedPreferredModel}
            reasoningEffort={selectedReasoningEffort}
            models={models}
            defaultModel={defaultModel}
            modelLoading={modelsLoading}
            modelLoadError={modelsError}
            modelSaving={modelSaving}
            evidenceAvailable={Boolean(evidenceMessage)}
            evidencePanelOpen={evidencePanelOpen}
            onOpenSidebar={() => setSidebarOpen(true)}
            onToggleEvidence={() => {
              if (wideEvidence) setEvidenceDismissed((value) => !value);
              else setEvidenceDrawerOpen((value) => !value);
            }}
            onReloadModels={reloadModels}
            onModelSave={handleModelSave}
          />

          {visibleModelError ? (
            <Alert severity="error" onClose={() => setModelError(null)} sx={{ borderRadius: 0 }}>
              {visibleModelError.message}
            </Alert>
          ) : null}
          {visibleModelNotice ? (
            <Alert
              severity={visibleModelNotice.severity}
              role={visibleModelNotice.severity === 'error' ? 'alert' : 'status'}
              aria-live={visibleModelNotice.severity === 'error' ? 'assertive' : 'polite'}
              onClose={() => setModelNotice(null)}
              sx={{ borderRadius: 0 }}
            >
              {visibleModelNotice.message}
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
              branchProjection={conversationState.branchProjection}
              branchChanging={conversationState.branchChanging}
              branchError={conversationState.branchError}
              onViewBranch={(messageId) => void conversationState.viewBranch(messageId)}
              onAdoptDisplayedBranch={() => void conversationState.adoptDisplayedBranch()}
              onReturnToActiveBranch={() => void conversationState.returnToActiveBranch()}
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
              branchProjection={conversationState.branchProjection}
              branchChanging={conversationState.branchChanging}
              branchError={conversationState.branchError}
              onViewBranch={(messageId) => void conversationState.viewBranch(messageId)}
              onAdoptDisplayedBranch={() => void conversationState.adoptDisplayedBranch()}
              onReturnToActiveBranch={() => void conversationState.returnToActiveBranch()}
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
              blockedReason={branchBlockedReason ?? modelBlockedReason}
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
        <AgentReportPreviewDialog
          open={reportPreviewRunId !== null}
          runId={reportPreviewRunId}
          onClose={() => setReportPreviewRunId(null)}
          onSaved={handleReportSaved}
        />
      </Box>
    </AgentMuiXProvider>
  );
}
