export type StrategyDraft = {
  id: number | string;
  name: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  isAutoSave?: boolean;
};
