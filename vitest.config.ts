/**
 * @file Vitest testing framework configuration
 *
 * This configuration sets up the Vitest test runner for the VectorDB
 * project, providing a fast and efficient testing environment. It configures:
 * - Global test utilities availability
 * - Node.js test environment for file system operations
 * - Test discovery and execution settings
 */

import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "@aurochs-builder/pptx/patcher": path.resolve(
        __dirname,
        "packages/@aurochs-builder/pptx/src/patcher",
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: [path.resolve(__dirname, "spec/vitest.setup.ts")],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["packages/**/*.{ts,tsx}", "spec/**/*.{ts,tsx}"],
    },
  },
});
