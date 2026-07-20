import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemButton from '@mui/material/ListItemButton';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import type { AsyncStatus, AgentConversationEntity } from '../state/agent-state.types';

type ConversationSidebarProps = {
  items: AgentConversationEntity[];
  currentConversationId: string | null;
  status: AsyncStatus;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  mobileOpen: boolean;
  mobile: boolean;
  activeConversationIds: string[];
  staleConversationIds: string[];
  onClose: () => void;
  onNew: () => void;
  onSelect: (conversationId: string) => void;
  onRetry: () => void;
  onLoadMore: () => void;
};

function groupLabel(dateValue: string): string {
  const value = new Date(dateValue);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startValue = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.floor((startToday - startValue) / 86_400_000);
  if (days <= 0) return '今天';
  if (days <= 7) return '最近 7 天';
  return '更早';
}

function SidebarContent({
  items,
  currentConversationId,
  status,
  error,
  hasMore,
  loadingMore,
  activeConversationIds,
  staleConversationIds,
  onNew,
  onSelect,
  onRetry,
  onLoadMore,
}: Omit<ConversationSidebarProps, 'mobileOpen' | 'mobile' | 'onClose'>) {
  const [query, setQuery] = useState('');
  const groupedItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const filtered = normalized
      ? items.filter((item) => item.title.toLocaleLowerCase().includes(normalized))
      : items;
    const groups = new Map<string, AgentConversationEntity[]>();
    filtered.forEach((item) => {
      const label = groupLabel(item.updatedAt);
      groups.set(label, [...(groups.get(label) ?? []), item]);
    });
    return [...groups.entries()];
  }, [items, query]);

  return (
    <Box sx={{ minHeight: 0, height: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          onClick={onNew}
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
          onChange={(event) => setQuery(event.target.value)}
          sx={{ mt: 1.5 }}
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
      <Divider />

      <Box sx={{ minHeight: 0, flex: 1, overflowY: 'auto', py: 1 }}>
        {status === 'loading' && items.length === 0 ? (
          <Box sx={{ px: 2, py: 1 }}>
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} variant="rounded" height={54} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : null}

        {error && items.length === 0 ? (
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

        {status !== 'loading' && !error && groupedItems.length === 0 ? (
          <EmptyContent
            title={query ? '没有匹配会话' : '暂无研究会话'}
            description={query ? '换个关键词试试' : undefined}
            sx={{ px: 2, py: 5 }}
          />
        ) : null}

        {groupedItems.map(([label, group]) => (
          <Box key={label} sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              sx={{ display: 'block', px: 2, py: 0.75, color: 'text.disabled' }}
            >
              {label}
            </Typography>
            <List disablePadding>
              {group.map((item) => {
                const selected = item.conversationId === currentConversationId;
                const isActive = activeConversationIds.includes(item.conversationId);
                const isStale = staleConversationIds.includes(item.conversationId);
                return (
                  <ListItemButton
                    key={item.conversationId}
                    component={RouterLink}
                    href={`/agent/${item.conversationId}`}
                    selected={selected}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => onSelect(item.conversationId)}
                    sx={{ mx: 1, px: 1.5, py: 1, minHeight: 54, borderRadius: 0.75 }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 600 }}>
                          {item.title}
                        </Typography>
                        {isActive || isStale ? (
                          <Box
                            component="span"
                            title={isActive ? '后台运行中' : '有新状态'}
                            sx={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', bgcolor: 'info.main' }}
                          />
                        ) : null}
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {item.messageCount} 条消息 · {fToNow(item.lastMessageAt)}
                      </Typography>
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}

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
      sx={{ width: 288, minWidth: 288, minHeight: 0, borderRight: 1, borderColor: 'divider' }}
    >
      <SidebarContent {...contentProps} />
    </Box>
  );
}
