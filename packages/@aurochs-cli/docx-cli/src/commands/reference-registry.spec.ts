/** @file DOCX reference documentation completeness verification tests. */

import fs from "node:fs";
import path from "node:path";
import { ALL_REGISTRIES, CLI_COMMANDS } from "./reference-registry";

// Resolve docx.md relative to the monorepo root
const DOCX_MD_PATH = path.resolve(
  __dirname,
  "../../../../../skills/aurochs-office/references/docx.md",
);

const markdown = fs.readFileSync(DOCX_MD_PATH, "utf-8");

describe("DOCX reference documentation completeness", () => {
  describe.each(ALL_REGISTRIES)("%s fields are documented", (_typeName, fields) => {
    const entries = Object.entries(fields as Record<string, string>);
    it.each(entries)('field "%s" appears in docx.md', (fieldName) => {
      expect(markdown).toContain(`"${fieldName}"`);
    });
  });

  describe("CLI commands", () => {
    it.each([...CLI_COMMANDS])('command "docx %s" is documented', (cmd) => {
      expect(markdown).toContain(`docx ${cmd}`);
    });
  });
});

describe("DOCX reference examples", () => {
  it("has a Build examples section", () => {
    expect(markdown).toContain("## Build examples");
  });

  it("has a Patch examples section", () => {
    expect(markdown).toContain("## Patch examples");
  });

  it("build examples contain valid JSON blocks", () => {
    const buildSection = markdown.split("## Build examples")[1] ?? "";
    const sectionEnd = buildSection.indexOf("\n## ");
    const content = sectionEnd > 0 ? buildSection.slice(0, sectionEnd) : buildSection;

    const jsonBlockPattern = /```jsonc?\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    const ctx = { match: jsonBlockPattern.exec(content) };
    while (ctx.match) {
      blocks.push(ctx.match[1]);
      ctx.match = jsonBlockPattern.exec(content);
    }

    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      const cleaned = block.replace(/\/\/.*$/gm, "").trim();
      expect(() => JSON.parse(cleaned)).not.toThrow();
    }
  });

  it("patch examples contain valid JSON blocks", () => {
    const patchSection = markdown.split("## Patch examples")[1] ?? "";
    const sectionEnd = patchSection.indexOf("\n## ");
    const content = sectionEnd > 0 ? patchSection.slice(0, sectionEnd) : patchSection;

    const jsonBlockPattern = /```jsonc?\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    const ctx = { match: jsonBlockPattern.exec(content) };
    while (ctx.match) {
      blocks.push(ctx.match[1]);
      ctx.match = jsonBlockPattern.exec(content);
    }

    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      const cleaned = block.replace(/\/\/.*$/gm, "").trim();
      expect(() => JSON.parse(cleaned)).not.toThrow();
    }
  });
});
