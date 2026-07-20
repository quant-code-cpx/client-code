import { useParams } from 'react-router';

import Box from '@mui/material/Box';

import { DashboardContent } from 'src/layouts/dashboard';

import { AgentShell } from '../components/agent-shell';
import { AgentProvider } from '../state/agent-provider';

export function AgentView() {
  const { conversationId } = useParams<{ conversationId?: string }>();

  return (
    <DashboardContent
      maxWidth={false}
      sx={{
        minHeight: 560,
        height: {
          xs: 'calc(100dvh - var(--layout-header-mobile-height))',
          lg: 'calc(100dvh - var(--layout-header-desktop-height))',
        },
        px: { xs: 1, sm: 2, lg: 3 },
        pb: { xs: 1, lg: 2 },
      }}
    >
      <Box sx={{ minHeight: 0, height: 1 }}>
        <AgentProvider initialConversationId={conversationId ?? null}>
          <AgentShell />
        </AgentProvider>
      </Box>
    </DashboardContent>
  );
}
