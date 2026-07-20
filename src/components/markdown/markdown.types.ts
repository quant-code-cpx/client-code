import type { Theme, SxProps } from '@mui/material/styles';

export type MarkdownCitationTarget = {
  href: string;
  label?: string;
};

export type MarkdownProps = {
  children: string;
  streaming?: boolean;
  maxLength?: number;
  sx?: SxProps<Theme>;
  citationResolver?: (citationId: string) => MarkdownCitationTarget | null;
};
