/**
 * @file ESLint rule to require explicit catch handling.
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow implicit or empty catch handlers that hide failures.",
    },
    schema: [],
    messages: {
      missingParam: "Catch clauses must bind the caught error and handle it explicitly.",
      emptyCatch: "Empty catch blocks are forbidden. Throw, report, or explicitly convert the error.",
      voidOnly: "Using `void` as catch handling is forbidden. Throw, report, or explicitly convert the error.",
      missingPromiseParam: "Promise catch callbacks must bind the caught error and handle it explicitly.",
    },
  },
  create(context) {
    const isPromiseCatchCall = (node) =>
      node.callee?.type === "MemberExpression" &&
      !node.callee.computed &&
      node.callee.property?.type === "Identifier" &&
      node.callee.property.name === "catch";

    const reportFunctionBody = (fn) => {
      if (fn.params.length === 0) {
        context.report({ node: fn, messageId: "missingPromiseParam" });
      }
      if (fn.body.type !== "BlockStatement") {
        return;
      }
      const statements = fn.body.body;
      if (statements.length === 0) {
        context.report({ node: fn.body, messageId: "emptyCatch" });
      }
      for (const statement of statements) {
        if (
          statement.type === "ExpressionStatement" &&
          statement.expression.type === "UnaryExpression" &&
          statement.expression.operator === "void"
        ) {
          context.report({ node: statement, messageId: "voidOnly" });
        }
      }
    };

    return {
      CatchClause(node) {
        if (!node.param) {
          context.report({ node, messageId: "missingParam" });
        }
        const statements = node.body?.body ?? [];
        if (statements.length === 0) {
          context.report({ node: node.body ?? node, messageId: "emptyCatch" });
        }
        for (const statement of statements) {
          if (
            statement.type === "ExpressionStatement" &&
            statement.expression.type === "UnaryExpression" &&
            statement.expression.operator === "void"
          ) {
            context.report({ node: statement, messageId: "voidOnly" });
          }
        }
      },
      CallExpression(node) {
        if (!isPromiseCatchCall(node)) {
          return;
        }
        const handler = node.arguments[0];
        if (!handler || !["ArrowFunctionExpression", "FunctionExpression"].includes(handler.type)) {
          return;
        }
        reportFunctionBody(handler);
      },
    };
  },
};
