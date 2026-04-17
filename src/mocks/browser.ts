/**
 * MSW browser integration — only activated when VITE_DEMO_MODE=true.
 *
 * This sets up a Service Worker that intercepts all API calls and
 * returns mock data, enabling the app to run without a backend.
 */
import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
