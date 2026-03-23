import { RuleTester } from "eslint";
import rule from "./prefer-switch-or-map.js";

const tester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

tester.run("prefer-switch-or-map", rule, {
  valid: [
    // switch-case is fine
    `switch (x.type) { case "a": break; case "b": break; }`,

    // single if without else-if
    `if (x.type === "a") { foo(); }`,

    // if / else (not else-if)
    `if (x.type === "a") { foo(); } else { bar(); }`,

    // different properties in each branch
    `if (x.type === "a") { foo(); } else if (y.kind === "b") { bar(); }`,

    // same property but only one branch with else (no else-if chain)
    `if (x.type === "a") { foo(); } else if (x.kind === "b") { bar(); }`,

    // minBranches: 3 — a 2-branch chain should pass
    {
      code: `if (x.type === "a") { foo(); } else if (x.type === "b") { bar(); }`,
      options: [{ minBranches: 3 }],
    },

    // non-member comparison (variable === literal)
    `if (x === "a") { foo(); } else if (x === "b") { bar(); }`,

    // computed property access — not tracked
    `if (x[key] === "a") { foo(); } else if (x[key] === "b") { bar(); }`,
  ],

  invalid: [
    // basic 2-branch chain on same property
    {
      code: `if (x.type === "a") { foo(); } else if (x.type === "b") { bar(); }`,
      errors: [{ messageId: "preferSwitchOrMap" }],
    },

    // 3-branch chain
    {
      code: `if (x.type === "a") { foo(); } else if (x.type === "b") { bar(); } else if (x.type === "c") { baz(); }`,
      errors: [{ messageId: "preferSwitchOrMap" }],
    },

    // nested member expression
    {
      code: `if (shape.content.type === "chart") { foo(); } else if (shape.content.type === "diagram") { bar(); }`,
      errors: [{ messageId: "preferSwitchOrMap" }],
    },

    // literal on left side
    {
      code: `if ("a" === x.type) { foo(); } else if ("b" === x.type) { bar(); }`,
      errors: [{ messageId: "preferSwitchOrMap" }],
    },

    // == operator
    {
      code: `if (x.type == "a") { foo(); } else if (x.type == "b") { bar(); }`,
      errors: [{ messageId: "preferSwitchOrMap" }],
    },

    // minBranches: 3 with 3-branch chain
    {
      code: `if (x.type === "a") { foo(); } else if (x.type === "b") { bar(); } else if (x.type === "c") { baz(); }`,
      options: [{ minBranches: 3 }],
      errors: [{ messageId: "preferSwitchOrMap" }],
    },
  ],
});
