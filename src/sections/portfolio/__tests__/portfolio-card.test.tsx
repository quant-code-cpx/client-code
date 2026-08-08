import type { PortfolioListItem } from 'src/api/portfolio';

import { useLocation } from 'react-router';
import { screen } from '@testing-library/react';
import { vi, it, expect, describe } from 'vitest';

import { renderWithProviders } from 'src/test/test-utils';

import { PortfolioCard } from '../portfolio-card';

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

const portfolio: PortfolioListItem = {
  id: 'portfolio-1',
  name: '成长组合',
  description: null,
  initialCash: 100000,
  holdingCount: 3,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z',
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe('PortfolioCard accessibility', () => {
  it('uses links for the main content and detail action', async () => {
    const { user } = renderWithProviders(
      <>
        <PortfolioCard portfolio={portfolio} onEdit={vi.fn()} onDelete={vi.fn()} />
        <LocationProbe />
      </>
    );
    const mainLink = screen.getByRole('link', { name: '查看投资组合 成长组合 的详情' });
    const detailLink = screen.getByRole('link', { name: '查看详情' });

    expect(mainLink).toHaveAttribute('href', '/portfolio/portfolio-1');
    expect(detailLink).toHaveAttribute('href', '/portfolio/portfolio-1');
    expect(mainLink.querySelector('button')).toBeNull();

    await user.tab();

    expect(mainLink).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/portfolio/portfolio-1');
  });

  it('keeps menu actions independent from navigation link', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { user } = renderWithProviders(
      <PortfolioCard portfolio={portfolio} onEdit={onEdit} onDelete={onDelete} />
    );

    await user.click(screen.getByRole('button', { name: '更多操作' }));
    await user.click(screen.getByRole('menuitem', { name: '编辑' }));

    expect(onEdit).toHaveBeenCalledWith(portfolio);

    await user.click(screen.getByRole('button', { name: '更多操作' }));
    await user.click(screen.getByRole('menuitem', { name: '删除' }));

    expect(onDelete).toHaveBeenCalledWith(portfolio);
  });
});
