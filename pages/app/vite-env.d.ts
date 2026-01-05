/**
 * @file Vite environment type definitions for the pages app.
 */

/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly BASE_URL: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
