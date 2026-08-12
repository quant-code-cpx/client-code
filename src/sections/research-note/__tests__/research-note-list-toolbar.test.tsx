import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { ResearchNoteListToolbar } from '../research-note-list-toolbar';

describe('ResearchNoteListToolbar', () => {
  it('gives the icon-only view buttons accessible names', () => {
    renderWithProviders(
      <ResearchNoteListToolbar
        availableTags={[]}
        filters={{
          tags: [],
          tsCode: '',
          keyword: '',
          sortBy: 'updatedAt',
          dateRange: '',
          pinnedOnly: false,
          hasStock: false,
        }}
        viewMode="card"
        onViewModeChange={vi.fn()}
        onFilterChange={vi.fn()}
        onSearch={vi.fn()}
        onResetFilters={vi.fn()}
      />
    );

    expect(screen.getByRole('group', { name: '研究笔记列表视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '卡片视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '表格视图' })).toBeInTheDocument();
  });
});
