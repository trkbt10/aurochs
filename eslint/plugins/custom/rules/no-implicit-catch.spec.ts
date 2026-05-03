/**
 * @file Unit tests for no-implicit-catch ESLint rule.
 */
import { RuleTester } from "eslint";
import rule from "./no-implicit-catch.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

ruleTester.run("no-implicit-catch", rule, {
  valid: [
    {
      code: `
        try {
          run();
        } catch (error) {
          throw new Error("failed", { cause: error });
        }
      `,
    },
    {
      code: `
        try {
          run();
        } catch (error) {
          report(error);
          throw error;
        }
      `,
    },
    {
      code: `
        run().catch((error) => {
          throw new Error("failed", { cause: error });
        });
      `,
    },
  ],
  invalid: [
    {
      code: `
        try {
          run();
        } catch {
          throw new Error("failed");
        }
      `,
      errors: [{ messageId: "missingParam" }],
    },
    {
      code: `
        try {
          run();
        } catch (error) {
        }
      `,
      errors: [{ messageId: "emptyCatch" }],
    },
    {
      code: `
        try {
          run();
        } catch (error) {
          void error;
        }
      `,
      errors: [{ messageId: "voidOnly" }],
    },
    {
      code: `
        run().catch(() => {
        });
      `,
      errors: [{ messageId: "missingPromiseParam" }, { messageId: "emptyCatch" }],
    },
  ],
});
