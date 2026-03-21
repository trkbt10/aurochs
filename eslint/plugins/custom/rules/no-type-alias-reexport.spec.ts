/**
 * @file Unit tests for no-type-alias-reexport ESLint rule.
 */
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import rule from "./no-type-alias-reexport.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

ruleTester.run("no-type-alias-reexport", rule, {
  valid: [
    // Non-imported type alias (primitive)
    {
      code: `export type Color = string;`,
    },
    // Non-imported type alias (literal)
    {
      code: `export type Config = { x: number };`,
    },
    // Intersection with extra fields (transformation)
    {
      code: `
        import type { Foo } from "../domain";
        export type Bar = Foo & { extra: string };
      `,
    },
    // Union type (transformation)
    {
      code: `
        import type { Foo } from "../domain";
        export type Bar = Foo | null;
      `,
    },
    // Utility type wrapping (has type arguments)
    {
      code: `
        import type { Foo } from "../domain";
        export type Bar = Partial<Foo>;
      `,
    },
    // Generic wrapper (has type arguments)
    {
      code: `
        import type { Foo } from "../domain";
        export type Bar = ReadonlyArray<Foo>;
      `,
    },
    // Non-exported type alias of import (not re-exported)
    {
      code: `
        import type { Foo } from "../domain";
        type Bar = Foo;
      `,
    },
    // Qualified name (not a simple Identifier)
    {
      code: `
        import * as Domain from "../domain";
        export type Bar = Domain.Foo;
      `,
    },
    // Local type used in alias (not imported)
    {
      code: `
        type Foo = string;
        export type Bar = Foo;
      `,
    },
  ],
  invalid: [
    // Basic type alias re-export (import type)
    {
      code: `
        import type { ResourceRelationshipResolver } from "../domain";
        export type ResourceResolver = ResourceRelationshipResolver;
      `,
      errors: [{ messageId: "noTypeAliasReexport" }],
    },
    // Same-name type alias re-export
    {
      code: `
        import type { Foo } from "../domain";
        export type Foo = Foo;
      `,
      errors: [{ messageId: "noTypeAliasReexport" }],
    },
    // Regular import used in type alias
    {
      code: `
        import { Bar } from "../utils";
        export type Baz = Bar;
      `,
      errors: [{ messageId: "noTypeAliasReexport" }],
    },
    // Package import re-export
    {
      code: `
        import type { Theme } from "@aurochs/core";
        export type AppTheme = Theme;
      `,
      errors: [{ messageId: "noTypeAliasReexport" }],
    },
    // Multiple type alias re-exports
    {
      code: `
        import type { Foo, Bar } from "../domain";
        export type MyFoo = Foo;
        export type MyBar = Bar;
      `,
      errors: [
        { messageId: "noTypeAliasReexport" },
        { messageId: "noTypeAliasReexport" },
      ],
    },
    // Renamed import re-exported
    {
      code: `
        import type { RawMasterTextStyles } from "../domain";
        export type MasterTextStyles = RawMasterTextStyles;
      `,
      errors: [{ messageId: "noTypeAliasReexport" }],
    },
  ],
});
