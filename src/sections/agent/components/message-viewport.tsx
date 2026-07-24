import type { ReactNode } from 'react';
import type { Components, VirtuosoHandle } from 'react-virtuoso';

import { Virtuoso } from 'react-virtuoso';
import { useRef, useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { MessageItem } from './message-item';

import type { AsyncStatus, AgentMessageEntity } from '../state/agent-state.types';

type MessageViewportProps = {
  messages: AgentMessageEntity[];
  status: AsyncStatus;
  error: string | null;
  hasOlder: boolean;
  onLoadOlder: () => void;
  onRetryLoad: () => void;
  onRegenerate: (messageId: string) => void;
  onRetryMessage: (message: AgentMessageEntity) => void;
  onSaveReport: (runId: string) => void;
};

type MessageViewportContext = { header: ReactNode };

function MessageViewportHeader({ context }: { context: MessageViewportContext }) {
  return context.header;
}

const VIRTUOSO_COMPONENTS: Components<AgentMessageEntity, MessageViewportContext> = {
  Header: MessageViewportHeader,
};

export function MessageViewport({
  messages,
  status,
  error,
  hasOlder,
  onLoadOlder,
  onRetryLoad,
  onRegenerate,
  onRetryMessage,
  onSaveReport,
}: MessageViewportProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const renderItem = useCallback(
    (_index: number, message: AgentMessageEntity) => (
      <MessageItem
        message={message}
        onRegenerate={onRegenerate}
        onRetry={onRetryMessage}
        onSaveReport={onSaveReport}
      />
    ),
    [onRegenerate, onRetryMessage, onSaveReport]
  );
  const header = useMemo(
    () =>
      hasOlder ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Button size="small" onClick={onLoadOlder}>
            加载更早消息
          </Button>
        </Box>
      ) : null,
    [hasOlder, onLoadOlder]
  );
  const virtuosoContext = useMemo(() => ({ header }), [header]);

  if (status === 'loading' && messages.length === 0) {
    return (
      <Box sx={{ flex: 1, px: { xs: 2, md: 4 }, py: 3 }}>
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} variant="rounded" height={88} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  if (error && messages.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
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
      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
        <EmptyContent
          title="开始一次量化研究"
          description="输入股票、行业、组合或策略问题"
          sx={{ py: 2 }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: 0, flex: 1, position: 'relative' }}>
      <Virtuoso<AgentMessageEntity, MessageViewportContext>
        ref={virtuosoRef}
        data={messages}
        itemContent={renderItem}
        context={virtuosoContext}
        components={VIRTUOSO_COMPONENTS}
        computeItemKey={(_index, message) => message.messageId}
        followOutput={(isAtBottom) => (isAtBottom ? 'auto' : false)}
        atBottomStateChange={setAtBottom}
        increaseViewportBy={{ top: 320, bottom: 480 }}
        style={{ height: '100%' }}
      />
      {!atBottom ? (
        <Button
          size="small"
          variant="contained"
          startIcon={<Iconify icon="solar:alt-arrow-down-bold" width={16} />}
          onClick={() => virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end' })}
          sx={{ position: 'absolute', right: 20, bottom: 16, boxShadow: 2 }}
        >
          回到最新
        </Button>
      ) : null}
    </Box>
  );
}
