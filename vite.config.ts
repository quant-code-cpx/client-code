import path from 'path';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import react from '@vitejs/plugin-react-swc';

// ----------------------------------------------------------------------

const PORT = 3039;
const DEV_HOST = process.env.VITE_DEV_HOST ?? '127.0.0.1';

// GitHub Pages demo mode: use sub-path base when VITE_DEMO_MODE is set
const isDemo = process.env.VITE_DEMO_MODE === 'true';

export default defineConfig({
  base: isDemo ? '/client-code/' : '/',
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
        dev: { logLevel: ['error'] },
      },
      overlay: {
        position: 'tl',
        initialIsOpen: false,
      },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', '@mui/x-chat-headless'],
    alias: [
      {
        find: /^src(.+)/,
        replacement: path.resolve(process.cwd(), 'src/$1'),
      },
    ],
  },
  optimizeDeps: {
    include: [
      '@mui/x-chat/headless',
      '@mui/x-chat/ChatComposer',
      '@mui/x-chat/ChatConversationList',
      '@mui/x-chat/ChatMessage',
      '@mui/x-chat/ChatMessageList',
      '@mui/x-chat/ChatMessageSources',
    ],
  },
  server: {
    port: PORT,
    host: DEV_HOST,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: { port: PORT, host: DEV_HOST },
});
