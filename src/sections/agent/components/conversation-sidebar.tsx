import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { ChatConversationList } from '@mui/x-chat/ChatConversationList';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import type { AsyncStatus } from '../state/agent-state.types';

type ConversationSidebarProps = {
  totalItemCount: number;
  visibleItemCount: number;
  query: string;
  status: AsyncStatus;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  mobileOpen: boolean;
  mobile: boolean;
  onClose: () => void;
  onNew: () => void;
  onQueryChange: (query: string) => void;
  onRetry: () => void;
  onLoadMore: () => void;
};

function EmptyConversationAvatar() {
  return null;
}

function SidebarContent({
  totalItemCount,
  visibleItemCount,
  query,
  status,
  error,
  hasMore,
  loadingMore,
  onNew,
  onQueryChange,
  onRetry,
  onLoadMore,
}: Omit<ConversationSidebarProps, 'mobileOpen' | 'mobile' | 'onClose'>) {
  return (
    <Box sx={{ minHeight: 0, height: 1, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2.25,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={(theme) => ({
            width: 30,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 1.25,
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            boxShadow: `0 4px 12px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.24)}`,
          })}
        >
          <Iconify icon="solar:magic-stick-3-bold-duotone" width={17} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            AI 研究
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.disabled', letterSpacing: 0.8 }}
          >
            RESEARCH DESK
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 1.5, pt: 1.75, pb: 1.25 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          onClick={onNew}
          sx={{ boxShadow: 'none' }}
        >
          新建研究
        </Button>
        <TextField
          fullWidth
          size="small"
          value={query}
          name="agent-conversation-search"
          autoComplete="off"
          placeholder="搜索会话…"
          onChange={(event) => onQueryChange(event.target.value)}
          sx={(theme) => ({
            mt: 1.25,
            '& .MuiOutlinedInput-root': {
              bgcolor: theme.vars.palette.background.default,
            },
          })}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifier-bold" width={17} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <Box sx={{ minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {status === 'loading' && totalItemCount === 0 ? (
          <Box sx={{ px: 2, py: 1 }}>
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} variant="rounded" height={54} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : null}

        {error && totalItemCount === 0 ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={onRetry}>
                重试
              </Button>
            }
            sx={{ mx: 1.5 }}
          >
            {error}
          </Alert>
        ) : null}

        {status !== 'loading' && !error && visibleItemCount === 0 ? (
          <EmptyContent
            title={query ? '没有匹配会话' : '暂无研究会话'}
            description={query ? '换个关键词试试' : undefined}
            sx={{ px: 2, py: 5 }}
          />
        ) : null}

        {visibleItemCount > 0 ? (
          <ChatConversationList
            aria-label="研究会话"
            slots={{ itemAvatar: EmptyConversationAvatar }}
            sx={{
              minHeight: 0,
              flex: 1,
              py: 0.5,
              bgcolor: 'transparent',
              '& .MuiChatConversationList-scroller': {
                borderRight: 0,
                bgcolor: 'transparent',
              },
              '& .MuiChatConversationList-item': {
                position: 'relative',
                minHeight: 68,
                mx: 1,
                px: 1.5,
                border: '1px solid transparent',
                borderRadius: 1.25,
              },
              '& .MuiChatConversationList-item[aria-selected="true"]': {
                bgcolor: 'action.selected',
                borderColor: 'primary.dark',
                '&::before': {
                  position: 'absolute',
                  top: 10,
                  bottom: 10,
                  left: -1,
                  width: 3,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  content: '""',
                },
              },
              '& .MuiChatConversationList-itemTitle': { fontWeight: 600 },
              '& .MuiChatConversationList-itemPreview': { color: 'text.disabled' },
            }}
          />
        ) : null}

        {hasMore && !query ? (
          <Box sx={{ px: 2, pb: 1 }}>
            <Button fullWidth size="small" loading={loadingMore} onClick={onLoadMore}>
              加载更多
            </Button>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export function ConversationSidebar(props: ConversationSidebarProps) {
  const { mobile, mobileOpen, onClose, ...contentProps } = props;
  if (mobile) {
    return (
      <Drawer
        open={mobileOpen}
        onClose={onClose}
        slotProps={{
          paper: { sx: { width: 300, maxWidth: '86vw', overscrollBehavior: 'contain' } },
        }}
      >
        <SidebarContent {...contentProps} />
      </Drawer>
    );
  }

  return (
    <Box
      component="aside"
      aria-label="研究会话"
      sx={{
        width: { md: 248, lg: 264 },
        minWidth: { md: 248, lg: 264 },
        minHeight: 0,
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.neutral',
      }}
    >
      <SidebarContent {...contentProps} />
    </Box>
  );
}
