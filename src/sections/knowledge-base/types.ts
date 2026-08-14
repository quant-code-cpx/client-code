import type { IconifyName } from 'src/components/iconify/register-icons';

export type KnowledgeSource = {
  title: string;
  publisher: string;
  url: string;
  coverage: string;
};

export type KnowledgeReview = {
  reviewedAt: string;
  sources: readonly KnowledgeSource[];
};

export type KnowledgeTopic = {
  code: string;
  slug: string;
  title: string;
  summary: string;
  keywords: readonly string[];
  order: number;
  knowledgePointIds: readonly string[];
  review: KnowledgeReview;
  loadContent: () => Promise<string>;
};

export type KnowledgeMajor = {
  code: string;
  slug: string;
  title: string;
  summary: string;
  icon: IconifyName;
  order: number;
  plannedTopicCount: number;
  topics: readonly KnowledgeTopic[];
};

export type KnowledgePoint = {
  id: string;
  title: string;
  markdown: string;
};

export type ParsedKnowledgeArticle = {
  intro: string;
  points: KnowledgePoint[];
};
