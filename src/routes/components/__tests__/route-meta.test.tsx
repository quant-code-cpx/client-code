import { render, cleanup, waitFor } from '@testing-library/react';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';

import { RouteMeta } from '../route-meta';

// ----------------------------------------------------------------------

function RouteContent() {
  return <div>route content</div>;
}

function MetaLayout() {
  return (
    <>
      <RouteMeta />
      <Outlet />
    </>
  );
}

function createRouter(initialEntry: string) {
  return createMemoryRouter(
    [
      {
        path: '/',
        Component: MetaLayout,
        handle: { title: '父路由标题' },
        children: [
          {
            index: true,
            Component: RouteContent,
            handle: {
              title: '市场快报 - Apex Quant',
              description: '首页市场数据总览',
              keywords: '量化,A股,仪表盘',
            },
          },
          {
            path: 'stock',
            Component: RouteContent,
            handle: { title: '股票 - Apex Quant' },
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );
}

afterEach(() => {
  cleanup();
  document.title = '';
});

describe('RouteMeta', () => {
  it('使用 deepest match 的 title、description 与 keywords', async () => {
    const router = createRouter('/');

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(document.title).toBe('市场快报 - Apex Quant');
    });

    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      '首页市场数据总览'
    );
    expect(document.head.querySelector('meta[name="keywords"]')).toHaveAttribute(
      'content',
      '量化,A股,仪表盘'
    );
  });

  it('无 description/keywords 的页面不会遗留上一个页面元数据', async () => {
    const dashboardRouter = createRouter('/');

    render(<RouterProvider router={dashboardRouter} />);

    await waitFor(() => {
      expect(document.title).toBe('市场快报 - Apex Quant');
    });

    cleanup();

    const stockRouter = createRouter('/stock');
    render(<RouterProvider router={stockRouter} />);

    await waitFor(() => {
      expect(document.title).toBe('股票 - Apex Quant');
    });

    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
    expect(document.head.querySelector('meta[name="keywords"]')).toBeNull();
  });
});
