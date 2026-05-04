import {
  getDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
  submitDraft,
  getDraftById,
  autoSaveDraft,
  getAutoSavedDraft,
} from '../strategy-draft';

vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

// ----------------------------------------------------------------------

describe('strategy draft api', () => {
  it('loads draft list via POST body-less endpoint', async () => {
    mockPost().mockResolvedValueOnce({ drafts: [] });

    await getDrafts();

    expect(mockPost()).toHaveBeenCalledWith('/api/strategy-draft/list');
  });

  it('loads draft detail by id in body', async () => {
    mockPost().mockResolvedValueOnce({ id: 1, name: 'demo', config: {} });

    await getDraftById(1);

    expect(mockPost()).toHaveBeenCalledWith('/api/strategy-draft/detail', { id: 1 });
  });

  it('creates and updates drafts with POST body', async () => {
    mockPost().mockResolvedValueOnce({ id: 1, name: 'demo', config: {} });
    await createDraft({ name: 'demo', config: { strategyType: 'SCREENING_ROTATION' } });
    expect(mockPost()).toHaveBeenCalledWith('/api/strategy-draft/create', {
      name: 'demo',
      config: { strategyType: 'SCREENING_ROTATION' },
    });

    mockPost().mockResolvedValueOnce({ id: 1, name: 'demo2', config: {} });
    await updateDraft({ id: 1, name: 'demo2' });
    expect(mockPost()).toHaveBeenCalledWith('/api/strategy-draft/update', { id: 1, name: 'demo2' });
  });

  it('deletes and submits drafts by body id', async () => {
    mockPost().mockResolvedValueOnce({ message: 'ok' });
    await deleteDraft(1);
    expect(mockPost()).toHaveBeenCalledWith('/api/strategy-draft/delete', { id: 1 });

    mockPost().mockResolvedValueOnce({ id: 'run-1', status: 'QUEUED', jobId: 'job-1' });
    await submitDraft(1, 'run name');
    expect(mockPost()).toHaveBeenCalledWith('/api/strategy-draft/submit', {
      id: 1,
      name: 'run name',
    });
  });

  it('supports auto-save endpoints', async () => {
    mockPost().mockResolvedValueOnce({ id: '__autosave__', updatedAt: '2026-05-02T00:00:00Z' });
    await autoSaveDraft({ config: { strategyType: 'SCREENING_ROTATION' } });
    expect(mockPost()).toHaveBeenCalledWith('/api/strategy-draft/auto-save', {
      config: { strategyType: 'SCREENING_ROTATION' },
    });

    mockPost().mockResolvedValueOnce(null);
    await getAutoSavedDraft();
    expect(mockPost()).toHaveBeenCalledWith('/api/strategy-draft/auto-save/get', {});
  });
});
