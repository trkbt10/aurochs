/**
 * @file ESLint flat config for the repository.
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import jsdocPlugin from "eslint-plugin-jsdoc";
import eslintComments from "eslint-plugin-eslint-comments";
import prettierConfig from "eslint-config-prettier";
// Local plugin and modularized rule groups
import customPlugin from "./eslint/plugins/custom/index.js";
import rulesJSDoc from "./eslint/rules/rules-jsdoc.js";
import rulesRestrictedSyntax from "./eslint/rules/rules-restricted-syntax.js";
import rulesCurly from "./eslint/rules/rules-curly.js";
import rulesNoTestImports from "./eslint/rules/rules-no-test-imports.js";
import rulesNoMocks from "./eslint/rules/rules-no-mocks.js";
import rulesCatchError from "./eslint/rules/rules-catch-error.js";

export default [
  // Ignore patterns
  {
    ignores: [
      "reference/**",
      "**/dist/**",
      "node_modules/**",
      "fixtures/**",
      "**/vendor/**",
      "demo/**",
      "dist/**",
      "build/**",
      "debug/**",
      "pages/public/**",
      "pages/dist/**",
      "*.config.ts",
      "eslint/**",
      ".*/**",
      "**/coverage/**",
      "tmp/**",
      "**/*.d.ts",
    ],
  },

  // JS/TS recommended sets (Flat-compatible)
  ...tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    // Disable conflicting Prettier rules (Flat-compatible eslint-config-prettier)
    prettierConfig,

    // Project common rules from here
    {
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
        },
      },
      plugins: {
        import: importPlugin,
        jsdoc: jsdocPlugin,
        "eslint-comments": eslintComments,
        "@typescript-eslint": tseslint.plugin,
        custom: customPlugin,
      },
      settings: {
        jsdoc: { mode: "typescript" },
      },
      rules: {
        "custom/ternary-length": "error",
        "custom/prefer-node-protocol": "error",
        // `as any`, `as unknown`, and `as never` are all SSoT escape
        // hatches. The rule enforces `as any` / `as unknown` as
        // errors today; `as never` detection is implemented in the
        // rule but not yet opted in here because ~60 pre-existing
        // `as never` sites (mostly tests) still need per-case
        // migration to proper domain objects. When the sweep is
        // finished, flip the options to
        //   ["error", { targets: ["any", "unknown", "never"] }]
        // and remove this comment.
        "custom/no-as-outside-guard": "error",
        "custom/no-nested-try": "error",
        "custom/no-iife-in-anonymous": "error",
        // Prohibit deep re-exports that cross multiple directory levels
        "custom/no-deep-reexport": ["error", { maxParentDepth: 0 }],
        // Prohibit @aurochs/* packages from importing @aurochs-ui/*
        "custom/no-aurochs-ui-import-in-aurochs": "error",
        // Prohibit @aurochs/* packages from importing @aurochs-office/*
        "custom/no-aurochs-office-import-in-aurochs": "error",
        // Prohibit @aurochs-office/* packages from importing @aurochs-builder/*
        "custom/no-aurochs-builder-import-in-aurochs-office": "error",
        // Prohibit @aurochs-renderer/* packages from importing @aurochs-builder/*
        "custom/no-builder-import-in-renderer": "error",
        // Prohibit cross-imports between scene-graph and Direct SVG rendering paths
        "custom/no-cross-render-path-import": "error",
        // Prohibit re-exporting from other packages
        "custom/no-cross-package-reexport": "error",
        // Prevent disabling no-cross-package-reexport via eslint-disable comments
        "eslint-comments/no-restricted-disable": [
          "error",
          "custom/no-cross-package-reexport",
        ],
        // Prohibit export * from (barrel exports)
        "custom/no-export-star": "error",
        // Prohibit bare @aurochs-renderer/* imports for reorganized packages (must use sub-paths)
        "custom/no-bare-renderer-import": "error",
        // Require object parameter for functions with 4+ params
        "custom/max-params": ["error", { max: 3 }],
        // Prohibit Node.js-only packages in browser code (must use .node.ts files)
        "custom/no-node-only-import": ["error", { packages: [] }],
        // Prohibit trivial type alias re-exports (export type X = ImportedY)
        "custom/no-type-alias-reexport": "error",
        "custom/prefer-switch-or-map": "warn",
        // `toKiwiRecord` is the builder's Kiwi-encoder boundary helper —
        // it MUST only be imported / called from
        // packages/@aurochs/fig/src/builder/**. Any other caller is
        // laundering typed BuilderNode into Record<string, unknown>,
        // which re-opens the SSoT escape hatch the helper replaced.
        "custom/no-to-kiwi-record-outside-builder": "error",
        // `buildGuidTranslationMap` / `translateOverrides` /
        // `getInstanceSymbolOverrides` / `getEffectiveSymbolID` /
        // `resolveSymbolGuidStr` from `@aurochs/fig/symbols` are the
        // low-level symbol-resolution primitives. Only 3 paths may
        // import them (plus specs and debug scripts):
        //   - `@aurochs-builder/fig/src/context/` — the domain
        //     override-path resolution SoT (`resolveOverridePaths`)
        //   - `@aurochs/fig/src/symbols/` — the primitives'
        //     implementation and the FigNode-level resolver
        //     (`resolveInstanceNode`)
        //   - `@aurochs-renderer/fig/src/symbols/` — the fig-viewer's
        //     context-bound closure wrapping `resolveInstanceNode`
        // Every other caller fragments the override-resolution SoT.
        "custom/no-guid-translation-outside-resolver": "error",
        // Inline DFS-by-id is banned — use `dfsById` in
        // `@aurochs/fig/tree` as the single SoT. Any new consumer
        // MUST route through a thin type-tying wrapper that delegates
        // to the primitive, ensuring a single bug fix or semantic
        // tweak propagates to every caller and divergent copies
        // cannot silently accumulate.
        "custom/no-inline-dfs-by-id": "error",
        // Prohibit direct Accordion/PropertySection in inspector panels; use OptionalPropertySection
        // Spread from modular groups
        ...rulesJSDoc,
        ...rulesRestrictedSyntax,
        // /* 3. Prohibit relative parent import (../../ etc.) */
        // "import/no-relative-parent-imports": "error",
        ...rulesCurly,
        ...rulesNoTestImports,
        ...rulesNoMocks,
        ...rulesCatchError,
      },
    },

    // CLI aggregator: re-exports sub-CLI programs by design
    {
      files: ["packages/@aurochs-cli/cli/src/index.ts"],
      rules: {
        "custom/no-cross-package-reexport": "off",
      },
    },

    // Fluent builder types require `interface` for self-referential generics
    // (TypeScript resolves interface extends lazily, but type aliases eagerly,
    // making `type A = F<A> & {...}` a circular reference error)
    {
      files: ["packages/@aurochs/fig/src/builder/shape/*.ts"],
      rules: {
        "@typescript-eslint/consistent-type-definitions": "off",
        // TSInterfaceDeclaration is required here (see comment above); keep all other selectors
        "no-restricted-syntax": [
          "warn",
          { selector: "ImportExpression", message: "dynamic import() is prohibited" },
          { selector: "TSImportType", message: "type import() (TS import type expression) is prohibited" },
          { selector: "ExportAllDeclaration[exported!=null]", message: "export * as is prohibited" },
          { selector: "ExportAllDeclaration[exportKind='type']", message: "export type * from is prohibited" },
          {
            selector:
              "ClassDeclaration" +
              ":not(:has(TSClassImplements[expression.name='Error']))" +
              ":not([superClass.name='Error'])" +
              ":not([superClass.property.name='Error'])" +
              ":not([superClass.object.name='globalThis'][superClass.property.name='Error'])",
            message: "Class implementation is not recommended. Please write as function-based as much as possible.",
          },
          {
            selector:
              "VariableDeclaration[kind='let']" +
              ":not(ForStatement > VariableDeclaration)" +
              ":not(ForInStatement > VariableDeclaration)" +
              ":not(ForOfStatement > VariableDeclaration)",
            message:
              "Use of let is prohibited. If you need to branch, create a separate function and use its return value. If absolutely necessary for performance issues, explicitly use // eslint-disable-next-line.",
          },
          {
            selector: "TSAsExpression TSAnyKeyword",
            message:
              "Avoid using 'as any'. Code using 'as any' may indicate incorrect type definitions or a misunderstanding; review it carefully. Resolve this by using appropriate type guards or correct typings instead.",
          },
          {
            selector: "TSTypeAssertion TSAnyKeyword",
            message:
              "Avoid using 'as any'. Code using 'as any' may indicate incorrect type definitions or a misunderstanding; review it carefully. Resolve this by using appropriate type guards or correct typings instead.",
          },
          {
            selector: "CatchClause:not([param])",
            message:
              "Catch clause must have an error parameter and handle the error properly.",
          },
          {
            selector: "CatchClause > BlockStatement > ExpressionStatement > UnaryExpression[operator='void']",
            message:
              "Using 'void' to suppress error handling is prohibited. Handle the error properly or re-throw it.",
          },
          {
            selector: "CallExpression[callee.type='FunctionExpression']",
            message: "IIFE (Immediately Invoked Function Expression) is prohibited. Extract to a named function instead.",
          },
          {
            selector: "CallExpression[callee.type='ArrowFunctionExpression']",
            message: "IIFE (Immediately Invoked Function Expression) is prohibited. Extract to a named function instead.",
          },
        ],
      },
    },

    // Tests-only: allow global test APIs so imports are unnecessary
    {
      files: [
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "**/*.test.ts",
        "**/*.test.tsx",
        "spec/**/*.ts",
        "spec/**/*.tsx",
        "spec/**/*.js",
        "spec/**/*.jsx",
      ],
      languageOptions: {
        globals: {
          // Core
          describe: "readonly",
          it: "readonly",
          test: "readonly",
          expect: "readonly",
          // Lifecycle
          beforeAll: "readonly",
          afterAll: "readonly",
          beforeEach: "readonly",
          afterEach: "readonly",
          // Suites/bench (Vitest-compatible)
          suite: "readonly",
          bench: "readonly",
        },
      },
    },
  ),
];
