/**
 * @file ESLint rule to prefer switch-case or object lookup over if-else-if chains
 * on the same property.
 *
 * Detects patterns like:
 *   if (x.type === "a") { ... } else if (x.type === "b") { ... }
 *
 * and reports them as violations, suggesting switch(x.type) or an object map.
 */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer switch-case or object lookup over if-else-if chains comparing the same property",
    },
    schema: [
      {
        type: "object",
        properties: {
          minBranches: {
            type: "integer",
            minimum: 2,
            description:
              "Minimum number of else-if branches (including the initial if) to trigger the rule.",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferSwitchOrMap:
        'Use switch({{property}}) or an object lookup instead of if-else-if chain on "{{property}}".',
    },
  },
  create(context) {
    const minBranches = (context.options[0] && context.options[0].minBranches) || 2;

    /**
     * Serialize a MemberExpression to a comparable string key.
     * e.g. `shape.content.type` → "shape.content.type"
     */
    function serializeMember(node) {
      if (node.type === "Identifier") {
        return node.name;
      }
      if (node.type === "MemberExpression" && !node.computed) {
        const obj = serializeMember(node.object);
        if (obj === null) {
          return null;
        }
        return obj + "." + node.property.name;
      }
      return null;
    }

    /**
     * Extract the property key string from an equality test, if it matches:
     *   <memberExpression> === <literal>
     *   <literal> === <memberExpression>
     */
    function extractComparedProperty(test) {
      if (!test || test.type !== "BinaryExpression") {
        return null;
      }
      if (test.operator !== "===" && test.operator !== "==") {
        return null;
      }
      // left === literal
      if (test.left.type === "MemberExpression" && test.right.type === "Literal") {
        return serializeMember(test.left);
      }
      // literal === right
      if (test.right.type === "MemberExpression" && test.left.type === "Literal") {
        return serializeMember(test.right);
      }
      return null;
    }

    /**
     * Count consecutive if-else-if branches that compare the same property.
     * Returns { property, count } or null.
     */
    function analyzeChain(node) {
      const firstProp = extractComparedProperty(node.test);
      if (firstProp === null) {
        return null;
      }

      let count = 1;
      let current = node.alternate;
      while (current && current.type === "IfStatement") {
        const prop = extractComparedProperty(current.test);
        if (prop !== firstProp) {
          break;
        }
        count++;
        current = current.alternate;
      }

      if (count < minBranches) {
        return null;
      }

      return { property: firstProp, count };
    }

    return {
      IfStatement(node) {
        // Only check top-level if statements (not else-if branches)
        if (node.parent && node.parent.type === "IfStatement" && node.parent.alternate === node) {
          return;
        }
        // Must have at least one else-if
        if (!node.alternate || node.alternate.type !== "IfStatement") {
          return;
        }

        const result = analyzeChain(node);
        if (result) {
          context.report({
            node,
            messageId: "preferSwitchOrMap",
            data: { property: result.property },
          });
        }
      },
    };
  },
};
