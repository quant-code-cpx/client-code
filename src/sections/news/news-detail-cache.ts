import type { NewsArticleDetailResponse } from 'src/api/news';

export class NewsDetailCache {
  private readonly entries = new Map<string, NewsArticleDetailResponse>();
  private readonly capacity: number;

  constructor(maximumEntries = 20) {
    this.capacity = Math.max(1, Math.floor(maximumEntries));
  }

  get(articleId: string, minimumRevision: number): NewsArticleDetailResponse | null {
    const detail = this.entries.get(articleId);
    if (!detail) return null;
    if (minimumRevision > 0 && detail.revision < minimumRevision) {
      this.entries.delete(articleId);
      return null;
    }
    this.entries.delete(articleId);
    this.entries.set(articleId, detail);
    return detail;
  }

  set(detail: NewsArticleDetailResponse): void {
    this.entries.delete(detail.articleId);
    while (this.entries.size >= this.capacity) {
      const oldest = this.entries.keys().next().value;
      if (typeof oldest !== 'string') break;
      this.entries.delete(oldest);
    }
    this.entries.set(detail.articleId, detail);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

export const newsDetailCache = new NewsDetailCache(20);
