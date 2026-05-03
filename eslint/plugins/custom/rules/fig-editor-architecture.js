/**
 * @file Enforce fig-editor responsibility folders.
 */

import path from "node:path";

const PACKAGE_MARKER = `${path.sep}packages${path.sep}@aurochs-ui${path.sep}fig-editor${path.sep}`;

function normalize(filename) {
  return filename.split(path.sep).join("/");
}

function figEditorRelative(filename) {
  const index = filename.indexOf(PACKAGE_MARKER);
  if (index === -1) {
    return undefined;
  }
  return normalize(filename.slice(index + PACKAGE_MARKER.length));
}

function isDirectChild(relativePath, dir) {
  if (!relativePath.startsWith(`${dir}/`)) {
    return false;
  }
  return relativePath.slice(dir.length + 1).split("/").length === 1;
}

function report(context, message) {
  context.report({
    loc: { line: 1, column: 0 },
    message,
  });
}

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce fig-editor responsibility-folder boundaries.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const filename = context.filename ?? context.getFilename();
        const relativePath = figEditorRelative(filename);
        if (!relativePath || relativePath === "<input>") {
          return;
        }
        if (isDirectChild(relativePath, "src/canvas") && relativePath !== "src/canvas/FigEditorCanvas.tsx") {
          report(context, "fig-editor src/canvas files must live under a responsibility folder; only FigEditorCanvas.tsx is allowed at the canvas root.");
          return;
        }
        if (isDirectChild(relativePath, "src/panels")) {
          report(context, "fig-editor src/panels files must live under inspector/, layers/, pages/, properties/, or sections/.");
          return;
        }
        if (isDirectChild(relativePath, "src/panels/sections")) {
          report(context, "fig-editor property sections must live under a responsibility folder such as paint/, layout/, component/, or text/.");
          return;
        }
        if (isDirectChild(relativePath, "spec/e2e") && relativePath.endsWith(".e2e.ts")) {
          report(context, "fig-editor E2E specs must live under a named responsibility folder, not directly under spec/e2e.");
        }
      },
    };
  },
};
