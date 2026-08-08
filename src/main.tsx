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
  // `onUnhandledRequest: 'bypass'` lets non-API requests (assets, etc.) pass through
  await worker.start({
    onUnhandledRequest: 'bypass',
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
