import { readLocalAutoSavedDraft, writeLocalAutoSavedDraft } from '../local-auto-saved-draft';

const storageKey = 'backtest:test:auto-save';

beforeEach(() => {
  window.localStorage.clear();
});

describe('local auto-saved backtest draft', () => {
  it('round-trips the workbench config through localStorage', () => {
    writeLocalAutoSavedDraft(
      storageKey,
      { strategyType: 'FACTOR_RANKING', topN: 20 },
      '2026-08-10'
    );

    expect(readLocalAutoSavedDraft(storageKey)).toEqual(
      expect.objectContaining({
        name: '上次编辑（自动保存）',
        config: { strategyType: 'FACTOR_RANKING', topN: 20 },
        updatedAt: '2026-08-10',
        isAutoSave: true,
      })
    );
  });

  it('ignores malformed persisted values', () => {
    window.localStorage.setItem(storageKey, '{bad-json');
    expect(readLocalAutoSavedDraft(storageKey)).toBeNull();
  });
});
