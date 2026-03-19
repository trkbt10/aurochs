/**
 * @file Unit tests for no-cross-package-reexport ESLint rule.
 */
import { RuleTester } from "eslint";
import rule from "./no-cross-package-reexport.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

ruleTester.run("no-cross-package-reexport", rule, {
  valid: [
    // Re-export from relative path is allowed
    {
      code: `export { foo } from './local';`,
    },
    {
      code: `export * from '../utils';`,
    },
    // Import from package and use with transformation
    {
      code: `
        import { Bar } from '@aurochs/utils';
        const transformed = transform(Bar);
        export { transformed };
      `,
    },
    // Wrapper function that does more than passthrough
    {
      code: `
        import { fn } from '@aurochs/utils';
        export function wrapper(x) {
          console.log('logging');
          return fn(x);
        }
      `,
    },
    // Wrapper function that calls a local function
    {
      code: `
        function localFn(x) { return x; }
        export function wrapper(x) {
          return localFn(x);
        }
      `,
    },
    // Arrow function calling local function
    {
      code: `
        function localFn(x) { return x; }
        export const wrapper = (x) => localFn(x);
      `,
    },
    // Arrow function with non-call expression body
    {
      code: `
        import { val } from '@aurochs/utils';
        export const wrapper = () => val + 1;
      `,
    },
    // Function that returns a method call (not Identifier callee)
    {
      code: `
        import { obj } from '@aurochs/utils';
        export function wrapper(x) {
          return obj.method(x);
        }
      `,
    },
    // Factory function: constructs different arguments (not a passthrough)
    {
      code: `
        import { createElement } from '@aurochs/xml';
        export function serializeGlow(glow) {
          return createElement("a:glow", { rad: glow.radius });
        }
      `,
    },
    // Extra arguments added (not a passthrough)
    {
      code: `
        import { fn } from '@aurochs/utils';
        export function wrapper(x) {
          return fn(x, 42);
        }
      `,
    },
    // Arguments reordered (not a passthrough)
    {
      code: `
        import { fn } from '@aurochs/utils';
        export function wrapper(a, b) {
          return fn(b, a);
        }
      `,
    },
    // Fewer arguments than params (not a passthrough)
    {
      code: `
        import { fn } from '@aurochs/utils';
        export function wrapper(a, b) {
          return fn(a);
        }
      `,
    },
  ],
  invalid: [
    // Direct re-export from package
    {
      code: `export { Foo } from '@aurochs/core';`,
      errors: [{ messageId: "noPackageReexport" }],
    },
    // export * from package
    {
      code: `export * from '@aurochs/core';`,
      errors: [{ messageId: "noPackageReexport" }],
    },
    // Indirect re-export
    {
      code: `
        import { Bar } from '@aurochs/utils';
        export { Bar };
      `,
      errors: [{ messageId: "noIndirectPackageReexport" }],
    },
    // Alias re-export
    {
      code: `
        import { Bar } from '@aurochs/utils';
        export const Baz = Bar;
      `,
      errors: [{ messageId: "noAliasReexport" }],
    },
    // Wrapper function re-export: export function
    {
      code: `
        import { isDragThresholdExceeded as coreIsDragThresholdExceeded } from '@aurochs-ui/editor-core/drag-utils';
        export function isDragThresholdExceeded(args) {
          return coreIsDragThresholdExceeded(args);
        }
      `,
      errors: [{ messageId: "noWrapperReexport" }],
    },
    // Wrapper function re-export: export const arrow (expression body)
    {
      code: `
        import { fn } from '@aurochs/utils';
        export const wrapper = (x) => fn(x);
      `,
      errors: [{ messageId: "noWrapperReexport" }],
    },
    // Wrapper function re-export: export const arrow (block body)
    {
      code: `
        import { fn } from '@aurochs/utils';
        export const wrapper = (x) => { return fn(x); };
      `,
      errors: [{ messageId: "noWrapperReexport" }],
    },
    // Wrapper function re-export: export const function expression
    {
      code: `
        import { fn } from '@aurochs/utils';
        export const wrapper = function(x) { return fn(x); };
      `,
      errors: [{ messageId: "noWrapperReexport" }],
    },
    // Wrapper with no args
    {
      code: `
        import { getData } from '@aurochs/utils';
        export function fetchData() {
          return getData();
        }
      `,
      errors: [{ messageId: "noWrapperReexport" }],
    },
  ],
});
