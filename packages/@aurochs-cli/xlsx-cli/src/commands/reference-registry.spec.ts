/** @file XLSX reference documentation completeness verification tests. */

import fs from "node:fs";
import path from "node:path";
import { ALL_REGISTRIES, CLI_COMMANDS } from "./reference-registry";

// Resolve xlsx.md relative to the monorepo root
const XLSX_MD_PATH = path.resolve(
  __dirname,
  "../../../../../skills/aurochs-office/references/xlsx.md",
);

const markdown = fs.readFileSync(XLSX_MD_PATH, "utf-8");

/**
 * Strip JSON-style // comments while preserving // inside quoted strings (e.g. URLs).
 * Replaces // inside strings with a placeholder, strips comments, then restores.
 */
function stripJsonComments(source: string): string {
  const placeholder = "<<DSLASH>>";
  return source
    .replace(/"(?:[^"\\]|\\.)*"/g, (m) => m.replaceAll("//", placeholder))
    .replace(/\/\/.*$/gm, "")
    .replaceAll(placeholder, "//")
    .trim();
}

/** Extract all fenced JSON blocks from a markdown string. */
function extractJsonBlocks(md: string): readonly string[] {
  return Array.from(md.matchAll(/```jsonc?\n([\s\S]*?)```/g), (m) => m[1]);
}

describe("XLSX reference documentation completeness", () => {
  describe.each(ALL_REGISTRIES)("%s fields are documented", (_typeName, fields) => {
    const entries = Object.entries(fields as Record<string, string>);
    it.each(entries)('field "%s" appears in xlsx.md', (fieldName) => {
      expect(markdown).toContain(`"${fieldName}"`);
    });
  });

  describe("CLI commands", () => {
    it.each([...CLI_COMMANDS])('command "xlsx %s" is documented', (cmd) => {
      expect(markdown).toContain(`xlsx ${cmd}`);
    });
  });
});

describe("XLSX reference edit examples", () => {
  it("has an Edit examples section", () => {
    expect(markdown).toContain("## Edit examples");
  });

  it("edit examples contain valid JSON blocks", () => {
    const editSection = markdown.split("## Edit examples")[1] ?? "";
    const sectionEnd = editSection.indexOf("\n## ");
    const content = sectionEnd > 0 ? editSection.slice(0, sectionEnd) : editSection;
    const blocks = extractJsonBlocks(content);

    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      const cleaned = stripJsonComments(block);
      expect(() => JSON.parse(cleaned)).not.toThrow();
    }
  });
});
