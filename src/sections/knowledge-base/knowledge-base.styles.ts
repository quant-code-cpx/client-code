import type { Theme, SxProps } from '@mui/material/styles';

import { varAlpha } from 'minimal-shared/utils';

export const pageHeaderSx: SxProps<Theme> = {
  mb: 3,
};

export const overviewGridSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
  gap: 2.5,
};

export const overviewCardSx: SxProps<Theme> = {
  height: 1,
  borderColor: 'divider',
  transition: (theme) =>
    theme.transitions.create(['border-color', 'background-color'], {
      duration: theme.transitions.duration.shorter,
    }),
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.04),
  },
};

export const articleGridSx: SxProps<Theme> = (theme) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 2.5,
  alignItems: 'start',
  minWidth: 0,
  [theme.breakpoints.up('lg')]: {
    gridTemplateColumns: '196px minmax(0, 1fr) 160px',
  },
});

export const stickyPanelSx: SxProps<Theme> = {
  position: { lg: 'sticky' },
  top: { lg: 88 },
  minWidth: 0,
};

export const navigationPaperSx: SxProps<Theme> = {
  overflow: 'hidden',
  borderColor: 'divider',
};

export const articlePaperSx: SxProps<Theme> = {
  minWidth: 0,
  p: 4,
  borderColor: 'divider',
};

export const articleIntroSx: SxProps<Theme> = {
  p: 2.5,
  mb: 4,
  bgcolor: 'background.neutral',
  borderColor: 'divider',
};

export const articleMarkdownSx: SxProps<Theme> = {
  fontSize: 16,
  lineHeight: 1.8,
  '& .MuiTypography-body2': {
    fontSize: 16,
    lineHeight: 1.8,
  },
  '& p': { my: 1.25 },
  '& ul, & ol': { my: 1.25 },
  '& blockquote': {
    mt: 0,
    mb: 1.5,
    py: 1.25,
    pr: 2,
    bgcolor: (theme) => varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
  },
};

export const knowledgePointSectionSx: SxProps<Theme> = {
  scrollMarginTop: 88,
};

export const sourceReviewSx: SxProps<Theme> = {
  mt: 4,
  p: 2.5,
  bgcolor: 'background.neutral',
  borderColor: 'divider',
};
