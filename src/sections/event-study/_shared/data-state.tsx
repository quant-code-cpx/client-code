import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyText?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  skeletonHeight?: number;
  children?: ReactNode;
};

export function DataState({
  loading,
  error,
  empty,
  emptyText = '暂无数据',
  emptyAction,
  onRetry,
  skeletonHeight = 280,
  children,
}: Props) {
  if (loading) {
    return <Skeleton variant="rectangular" height={skeletonHeight} sx={{ borderRadius: 1.5 }} />;
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button size="small" color="inherit" onClick={onRetry}>
              重试
            </Button>
          ) : undefined
        }
      >
        {error}
      </Alert>
    );
  }

  if (empty) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Stack spacing={1.5} alignItems="center">
          <Iconify icon="solar:document-bold" width={48} sx={{ color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">
            {emptyText}
          </Typography>
          {emptyAction}
        </Stack>
      </Box>
    );
  }

  return <>{children}</>;
}
