/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_API_PORT?: string;
  readonly VITE_ADMIN_API_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
