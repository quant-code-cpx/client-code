export type ResearchNoteDraftPayload = {
  title: string;
  content: string;
  tsCode: string | null;
  tags: string[];
  isPinned: boolean;
};

export type StoredResearchNoteDraft = ResearchNoteDraftPayload & {
  savedAt: string;
};

type DraftScope = number | 'new';

const DRAFT_PREFIX = 'research-note-draft:v2:';
const LEGACY_DRAFT_PREFIX = 'research-note-draft-';

function draftKey(userId: number, scope: DraftScope): string {
  return `${DRAFT_PREFIX}${userId}:${scope}`;
}

function isStoredDraft(value: unknown): value is StoredResearchNoteDraft {
  if (value === null || typeof value !== 'object') return false;
  const draft = value as Partial<StoredResearchNoteDraft>;
  return (
    typeof draft.title === 'string' &&
    typeof draft.content === 'string' &&
    (typeof draft.tsCode === 'string' || draft.tsCode === null) &&
    Array.isArray(draft.tags) &&
    draft.tags.every((tag) => typeof tag === 'string') &&
    typeof draft.isPinned === 'boolean' &&
    typeof draft.savedAt === 'string'
  );
}

export function readResearchNoteDraft(
  userId: number,
  scope: DraftScope
): StoredResearchNoteDraft | null {
  const key = draftKey(userId, scope);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    if (isStoredDraft(draft)) return draft;
    localStorage.removeItem(key);
  } catch {
    // 无法解析或访问存储时按无草稿处理。
  }
  return null;
}

export function writeResearchNoteDraft(
  userId: number,
  scope: DraftScope,
  payload: ResearchNoteDraftPayload
): void {
  try {
    localStorage.setItem(draftKey(userId, scope), JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
  } catch {
    // 配额不足或无存储权限时不影响编辑。
  }
}

export function removeResearchNoteDraft(userId: number, scope: DraftScope): void {
  try {
    localStorage.removeItem(draftKey(userId, scope));
  } catch {
    // 无存储权限时忽略。
  }
}

/** 登出时移除当前浏览器中的笔记草稿，避免下一位登录者恢复前一位用户的内容。 */
export function clearResearchNoteDrafts(): void {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(DRAFT_PREFIX) || key?.startsWith(LEGACY_DRAFT_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // 无存储权限时忽略。
  }
}
