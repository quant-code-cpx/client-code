import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router';

import App from './app';
import { routesSection } from './routes/sections';
import { RouteMeta, ErrorBoundary } from './routes/components';

// ----------------------------------------------------------------------

const router = createBrowserRouter(
  [
    {
      Component: () => (
        <App>
          <RouteMeta />
          <Outlet />
        </App>
      ),
      errorElement: <ErrorBoundary />,
      children: routesSection,
    },
  ],
  { basename: import.meta.env.BASE_URL }
);

async function enableMocking() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return;

  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest(request, print) {
      const { pathname } = new URL(request.url);
      if (!pathname.startsWith('/api/')) return;

      print.error();
      throw new Error(`演示模式缺少 API mock：${request.method} ${pathname}`);
    },
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}

const root = createRoot(document.getElementById('root')!);

enableMocking().then(() => {
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
});
