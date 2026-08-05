import type { UIEvent, ElementRef } from 'react';

import { useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import { ChatMessage } from '@mui/x-chat/ChatMessage';
import { ChatMessageList } from '@mui/x-chat/ChatMessageList';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { MessageItem } from './message-item';

import type {
  AsyncStatus,
  AgentMessageEntity,
  AgentRunProjection,
} from '../state/agent-state.types';

type MessageViewportProps = {
  messages: AgentMessageEntity[];
  activeRun: AgentRunProjection | null;
  status: AsyncStatus;
  error: string | null;
  hasOlder: boolean;
  onLoadOlder: () => void;
  onRetryLoad: () => void;
  onRegenerate: (messageId: string) => void;
  onRetryMessage: (message: AgentMessageEntity) => void;
  onSaveReport: (runId: string) => void;
  onContinue: () => void;
};

const AUTO_SCROLL_BUFFER = 24;

export function MessageViewport({
  messages,
  activeRun,
  status,
  error,
  hasOlder,
  onLoadOlder,
  onRetryLoad,
  onRegenerate,
  onRetryMessage,
  onSaveReport,
  onContinue,
}: MessageViewportProps) {
  const messageListRef = useRef<ElementRef<typeof ChatMessageList>>(null);
  const messageListContentRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const messageIds = useMemo(() => messages.map((message) => message.messageId), [messages]);
  const messageById = useMemo(
    () => new Map(messages.map((message) => [message.messageId, message])),
    [messages]
  );
  const latestMessage = messages.at(-1);
  const latestMessageId = latestMessage?.messageId;
  const latestMessageIsLocalUser =
    latestMessage?.role === 'USER' && latestMessage.messageId.startsWith('local:');

  const scrollToLatest = useCallback(() => {
    messageListRef.current?.scrollToBottom();

    const viewport = messageListContentRef.current?.parentElement;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;

    followLatestRef.current = true;
    setAtBottom(true);
  }, []);

  const scheduleScrollToLatest = useCallback(() => {
    if (typeof requestAnimationFrame === 'undefined') {
      scrollToLatest();
      return;
    }

    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = requestAnimationFrame(scrollToLatest);
    });
  }, [scrollToLatest]);

  useLayoutEffect(() => {
    if (!latestMessageId) return;

    if (latestMessageIsLocalUser) followLatestRef.current = true;

    if (followLatestRef.current) scheduleScrollToLatest();
  }, [latestMessageId, latestMessageIsLocalUser, scheduleScrollToLatest]);

  useEffect(() => {
    const content = messageListContentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      if (followLatestRef.current) scheduleScrollToLatest();
    });
    observer.observe(content);

    return () => observer.disconnect();
  }, [latestMessageId, scheduleScrollToLatest]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    },
    []
  );

  const renderItem = useCallback(
    ({ id }: { id: string; index: number }) => {
      const message = messageById.get(id);
      if (!message) return null;

      return (
        <ChatMessage
          messageId={id}
          slots={{ avatar: null, error: null }}
          sx={{
            display: 'block',
            p: 0,
            '&.MuiChatMessage-noAvatar': { p: 0 },
          }}
        >
          <MessageItem
            message={message}
            run={
              activeRun &&
              (activeRun.assistantMessageId === message.messageId ||
                activeRun.runId === message.run?.runId)
                ? activeRun
                : null
            }
            onRegenerate={onRegenerate}
            onRetry={onRetryMessage}
            onSaveReport={onSaveReport}
            onContinue={onContinue}
          />
        </ChatMessage>
      );
    },
    [activeRun, messageById, onContinue, onRegenerate, onRetryMessage, onSaveReport]
  );
  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;
    const nextAtBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= AUTO_SCROLL_BUFFER;

    followLatestRef.current = nextAtBottom;
    setAtBottom(nextAtBottom);
  }, []);

  if (status === 'loading' && messages.length === 0) {
    return (
      <Box sx={{ flex: 1, bgcolor: 'background.default', px: { xs: 2, md: 4 }, py: 3 }}>
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} variant="rounded" height={88} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  if (error && messages.length === 0) {
    return (
      <Box
        sx={{ flex: 1, display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 3 }}
      >
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onRetryLoad}>
              重新加载
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box
        sx={{ flex: 1, display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 3 }}
      >
        <Box sx={{ maxWidth: 520, textAlign: 'center' }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              color: 'primary.main',
              bgcolor: 'background.paper',
            }}
          >
            <Iconify icon="solar:magic-stick-3-bold-duotone" width={26} />
          </Box>
          <EmptyContent
            title="开始一次量化研究"
            description="输入股票、行业、组合或策略问题，研究结论、执行轨迹与引用证据将在同一工作区呈现。"
            sx={{ py: 0 }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <ChatMessageList
      ref={messageListRef}
      items={messageIds}
      renderItem={renderItem}
      autoScroll={{ buffer: AUTO_SCROLL_BUFFER }}
      enableRovingFocus
      onReachTop={hasOlder ? onLoadOlder : undefined}
      overlay={
        !atBottom ? (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, pointerEvents: 'none' }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<Iconify icon="solar:alt-arrow-down-bold" width={16} />}
              onClick={() => messageListRef.current?.scrollToBottom({ behavior: 'smooth' })}
              sx={{ boxShadow: 2, pointerEvents: 'auto' }}
            >
              回到最新
            </Button>
          </Box>
        ) : null
      }
      slotProps={{
        messageListContent: { ref: messageListContentRef },
        messageListScroller: { onScroll: handleScroll },
      }}
      sx={{
        bgcolor: 'background.default',
        '& [data-message-list-row]': {
          contentVisibility: 'auto',
          containIntrinsicSize: '84px',
        },
      }}
    />
  );
}
