/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Clerk publishable key (`pk_…`); required at runtime for auth + cloud storage. */
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
