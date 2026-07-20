/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_ENABLED?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AGENT_STREAM_MAX_RETRIES?: string;
  readonly VITE_AGENT_STREAM_STALE_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
