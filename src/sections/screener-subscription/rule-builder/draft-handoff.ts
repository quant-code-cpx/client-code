import type { SubscriptionRuleSpec, SubscriptionTriggerSpec } from 'src/api/screener-subscription';

// ----------------------------------------------------------------------

const DRAFT_KEY = 'screener-subscription:draft:v1';
const DRAFT_TTL_MS = 30 * 60 * 1000;

export type SubscriptionDraft = {
  createdAt: number;
  source: 'factor' | 'stock' | 'signal';
  name?: string;
  ruleSpec: SubscriptionRuleSpec;
  triggerSpec?: Partial<SubscriptionTriggerSpec>;
};

export function saveSubscriptionDraft(draft: Omit<SubscriptionDraft, 'createdAt'>): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, createdAt: Date.now() }));
}

export function consumeSubscriptionDraft(): SubscriptionDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  sessionStorage.removeItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as SubscriptionDraft;
    if (!draft.createdAt || Date.now() - draft.createdAt > DRAFT_TTL_MS) return null;
    return draft;
  } catch {
    return null;
  }
}
