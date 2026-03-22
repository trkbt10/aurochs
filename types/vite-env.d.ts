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
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  /** JSDOM instance type. */
  export type JSDOMInstance = {
    readonly window: Window;
  };
  /** JSDOM constructor type. */
  export type JSDOMConstructor = new (html?: string, options?: unknown) => JSDOMInstance;
  /** JSDOM constructor. */
  export const JSDOM: JSDOMConstructor;
}

