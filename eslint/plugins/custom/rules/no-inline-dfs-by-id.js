/**
 * @file Custom rule: forbid hand-rolled DFS-by-id over tree shapes.
 *
 * The repo's single SoT for "find a node by id within a tree" is
 * `dfsById` in `@aurochs/fig/tree`. Any new consumer that hand-rolls
 * the DFS (recursive or iterative) fragments that SoT: a bug fix or
 * semantic adjustment applied to one copy silently leaves the others
 * diverged.
 *
 * This rule detects the structural signature of an inline DFS-by-id:
 *
 *   for-of / while loop whose body contains
 *     - an `if` that compares a property chain ending in `.id` / `.guid`
 *       against a parameter, AND
 *     - a recursive self-call OR a stack/queue push on a `.children`
 *       (or equivalent) collection
 *
 * False positives are easy to suppress locally (extract to helper, or
 * the rare legitimate "visit every node" case uses a different shape).
 * The cost of a false positive is a lint comment; the cost of a missed
 * duplicate is a silent divergence in slot resolution — which is what
 * we're protecting against.
 *
 * Opt-out: paths containing the string `@aurochs/fig/src/tree/` are
 * exempt (that's where the SoT itself lives).
 */

function isExemptFile(filename) {
  if (!filename) { return true; }
  if (filename.includes("/tree/dfs-by-id.ts")) { return true; }
  if (filename.includes("/tree/dfs-by-id.spec.ts")) { return true; }
  if (filename.endsWith(".spec.ts") || filename.endsWith(".spec.tsx")) { return true; }
  return false;
}

/** Walks an AST sub-tree and returns true if it matches "compares .id/.guid to an outer identifier". */
function containsIdComparison(node) {
  if (!node || typeof node !== "object") { return false; }
  if (node.type === "BinaryExpression" && (node.operator === "===" || node.operator === "==")) {
    for (const side of [node.left, node.right]) {
      if (side && side.type === "MemberExpression" && side.property && side.property.type === "Identifier") {
        const name = side.property.name;
        if (name === "id" || name === "guid") { return true; }
      }
    }
  }
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "loc" || key === "range") { continue; }
    const v = node[key];
    if (Array.isArray(v)) {
      for (const item of v) { if (containsIdComparison(item)) { return true; } }
    } else if (v && typeof v === "object" && v.type) {
      if (containsIdComparison(v)) { return true; }
    }
  }
  return false;
}

/** Detects a recursive call to the enclosing function (by name) anywhere under `node`. */
function containsRecursiveCallTo(node, fnName) {
  if (!node || typeof node !== "object" || !fnName) { return false; }
  if (node.type === "CallExpression" && node.callee && node.callee.type === "Identifier" && node.callee.name === fnName) {
    return true;
  }
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "loc" || key === "range") { continue; }
    const v = node[key];
    if (Array.isArray(v)) {
      for (const item of v) { if (containsRecursiveCallTo(item, fnName)) { return true; } }
    } else if (v && typeof v === "object" && v.type) {
      if (containsRecursiveCallTo(v, fnName)) { return true; }
    }
  }
  return false;
}

/** Detects a `.push(` on `.children` (or similar children-like property) under `node`. */
function containsChildrenStackPush(node) {
  if (!node || typeof node !== "object") { return false; }
  if (node.type === "CallExpression"
    && node.callee && node.callee.type === "MemberExpression"
    && node.callee.property && node.callee.property.type === "Identifier"
    && node.callee.property.name === "push"
    && node.arguments && node.arguments.some((arg) =>
      arg.type === "MemberExpression"
      && arg.property && arg.property.type === "Identifier"
      && (arg.property.name === "children" || arg.property.name === "childGuids"))) {
    return true;
  }
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "loc" || key === "range") { continue; }
    const v = node[key];
    if (Array.isArray(v)) {
      for (const item of v) { if (containsChildrenStackPush(item)) { return true; } }
    } else if (v && typeof v === "object" && v.type) {
      if (containsChildrenStackPush(v)) { return true; }
    }
  }
  return false;
}

function enclosingFunctionName(node) {
  let cur = node.parent;
  while (cur) {
    if (cur.type === "FunctionDeclaration" && cur.id) { return cur.id.name; }
    if (cur.type === "VariableDeclarator" && cur.id && cur.id.type === "Identifier"
        && (cur.init?.type === "FunctionExpression" || cur.init?.type === "ArrowFunctionExpression")) {
      return cur.id.name;
    }
    cur = cur.parent;
  }
  return undefined;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline DFS-by-id implementations. Use `dfsById` from " +
        "`@aurochs/fig/tree` as the single source of truth for " +
        "identifier-based tree lookups so a single bug fix applies to " +
        "every consumer and future code cannot silently diverge.",
      recommended: true,
    },
    schema: [],
    messages: {
      inlineDfs:
        "Hand-rolled DFS-by-id detected. Use `dfsById` from " +
        "`@aurochs/fig/tree` as the single source of truth — route this " +
        "lookup through a thin type-tying wrapper that delegates to it.",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (isExemptFile(filename)) { return {}; }

    function checkLoop(loopNode) {
      if (!containsIdComparison(loopNode)) { return; }
      const fnName = enclosingFunctionName(loopNode);
      const recursive = fnName ? containsRecursiveCallTo(loopNode, fnName) : false;
      const hasStackPush = containsChildrenStackPush(loopNode);
      if (!recursive && !hasStackPush) { return; }
      context.report({ node: loopNode, messageId: "inlineDfs" });
    }

    return {
      ForOfStatement: checkLoop,
      WhileStatement: checkLoop,
    };
  },
};
