import { Markdown } from 'src/components/markdown/markdown';

// ----------------------------------------------------------------------

type Props = {
  content: string;
};

export function ResearchNotePreview({ content }: Props) {
  return <Markdown>{content}</Markdown>;
}
