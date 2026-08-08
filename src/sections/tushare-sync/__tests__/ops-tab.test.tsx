import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { OpsTab } from '../ops-tab';

vi.mock('../cache-stats-tab', () => ({ CacheStatsTab: () => <div>缓存内容</div> }));
vi.mock('../retry-queue-tab', () => ({ RetryQueueTab: () => <div>重试队列内容</div> }));

describe('OpsTab feature gate', () => {
  it('保留缓存与重试队列两个子 Tab', async () => {
    const { user } = renderWithProviders(<OpsTab isReadOnly={false} refreshKey={0} />);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['缓存', '重试队列']);
    expect(screen.getByText('缓存内容')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '重试队列' }));
    expect(screen.getByText('重试队列内容')).toBeInTheDocument();
  });
});
