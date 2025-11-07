/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SSO_CLIENT_ID: string;
  readonly VITE_REFRESH_BUFFER_TIME: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
