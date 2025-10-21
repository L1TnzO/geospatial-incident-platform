/// <reference types="vite/client" />

declare namespace ImportMeta {
  interface Env {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_API_TIMEOUT_MS?: string;
  }

  interface ImportMeta {
    readonly env: Env;
  }
}
