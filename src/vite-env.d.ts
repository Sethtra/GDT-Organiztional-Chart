/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_HR_FEATURES_ENABLED?: string;
  readonly VITE_CHART_VERSION_WRITES_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
