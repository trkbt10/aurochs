/** @file Vite environment type declarations and module augmentations */
/// <reference types="vite/client" />

/**
 * Vite Worker import type declaration
 *
 * When importing with `?worker` suffix, Vite bundles the file as a Web Worker
 * and returns a Worker constructor.
 */
declare module "*?worker" {
  const WorkerConstructor: {
    new (): Worker;
  };
  export default WorkerConstructor;
}

/**
 * Minimal JSDOM type declaration for package-local typechecking.
 *
 * Some package test suites import `JSDOM` directly, but `jsdom` does not ship
 * TypeScript declarations.
 */
declare module "jsdom" {
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  export class JSDOM {
    constructor(html?: string, options?: unknown);
    readonly window: Window;
  }
}

