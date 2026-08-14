import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { NavContent, isNavPathActive } from '../nav';

import type { NavItem } from '../../nav-config-dashboard';

const routeState = vi.hoisted(() => ({ pathname: '/stock/detail/600519.SH' }));

vi.mock('src/routes/hooks', () => ({ usePathname: () => routeState.pathname }));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const navData: NavItem[] = [
  { title: '首页', path: '/', exact: true, icon: <span>H</span> },
  {
    title: '股票中心',
    path: '/stock',
    icon: <span>S</span>,
    children: [
      { title: '股票列表', path: '/stock', icon: <span>L</span> },
      {
        title: '股票详情',
        path: '/stock/detail',
        activePaths: ['/equity/detail'],
        icon: <span>D</span>,
      },
    ],
  },
];

describe('isNavPathActive', () => {
  it('exact 路由不吞掉后代，普通路由支持深链与兼容 activePaths', () => {
    expect(isNavPathActive('/stock', { title: '股票', path: '/stock', exact: true, icon: null }, '/')).toBe(
      true
    );
    expect(
      isNavPathActive('/stock/detail', { title: '股票', path: '/stock', exact: true, icon: null }, '/')
    ).toBe(false);
    expect(
      isNavPathActive('/stock/detail/600519.SH', { title: '详情', path: '/stock/detail', icon: null }, '/stock')
    ).toBe(true);
    expect(
      isNavPathActive(
        '/equity/detail/600519.SH',
        { title: '详情', path: '/stock/detail', activePaths: ['/equity/detail'], icon: null },
        '/stock'
      )
    ).toBe(true);
  });

  it('父路径同名子项只在精确命中时激活，避免抢占更具体子路由', () => {
    expect(
      isNavPathActive('/stock/detail/600519.SH', { title: '列表', path: '/stock', icon: null }, '/stock')
    ).toBe(false);
  });
});

describe('NavContent', () => {
  beforeEach(() => {
    routeState.pathname = '/stock/detail/600519.SH';
  });

  it('深链自动展开父组，只给最长匹配子路由 aria-current', async () => {
    const { user } = renderWithProviders(
      <NavContent data={navData} slots={{ topArea: <div>导航头</div>, bottomArea: <div>导航尾</div> }} />
    );

    const group = screen.getByRole('button', { name: /股票中心/ });
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /股票详情/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /股票列表/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('导航头')).toBeInTheDocument();
    expect(screen.getByText('导航尾')).toBeInTheDocument();

    await user.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'false');
    await user.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'true');
  });

  it('无子项的精确当前路由暴露 page 语义', () => {
    routeState.pathname = '/';
    renderWithProviders(<NavContent data={navData} />);

    expect(screen.getByRole('link', { name: /首页/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /股票中心/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
