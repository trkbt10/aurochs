/**
 * @file Integration tests for docx-cli build and patch commands.
 *
 * Tests runBuild and runPatch against real DOCX files,
 * then verifies output via runInfo and runExtract.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { runBuild } from "./build";
import { runPatch } from "./patch";
import { runInfo } from "./info";
import { runExtract } from "./extract";

// =============================================================================
// Test Setup
// =============================================================================

// eslint-disable-next-line no-restricted-syntax -- beforeAll/afterAll pattern requires let
let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "docx-cli-test-"));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// =============================================================================
// Helpers
// =============================================================================

async function writeSpecFile(name: string, specObj: object): Promise<string> {
  const specPath = path.join(tmpDir, name);
  await fs.writeFile(specPath, JSON.stringify(specObj, null, 2));
  return specPath;
}

// =============================================================================
// runBuild Tests
// =============================================================================

describe("runBuild", () => {
  it("builds a DOCX file from JSON spec and creates output file", async () => {
    const specPath = await writeSpecFile("build-basic.json", {
      output: "basic.docx",
      content: [
        { type: "paragraph", runs: [{ text: "Hello World" }] },
      ],
    });

    const result = await runBuild(specPath);

    expect(result.success).toBe(true);
    if (!result.success) { return; }

    expect(result.data.outputPath).toBe("basic.docx");
    expect(result.data.paragraphCount).toBe(1);
    expect(result.data.tableCount).toBe(0);

    const outputPath = path.join(tmpDir, "basic.docx");
    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("builds a DOCX with tables and reports correct counts", async () => {
    const specPath = await writeSpecFile("build-table.json", {
      output: "table.docx",
      content: [
        { type: "paragraph", runs: [{ text: "Title" }] },
        {
          type: "table",
          rows: [
            {
              cells: [
                { content: [{ type: "paragraph", runs: [{ text: "A" }] }] },
                { content: [{ type: "paragraph", runs: [{ text: "B" }] }] },
              ],
            },
            {
              cells: [
                { content: [{ type: "paragraph", runs: [{ text: "C" }] }] },
                { content: [{ type: "paragraph", runs: [{ text: "D" }] }] },
              ],
            },
          ],
        },
        { type: "paragraph", runs: [{ text: "End" }] },
      ],
    });

    const result = await runBuild(specPath);

    expect(result.success).toBe(true);
    if (!result.success) { return; }

    expect(result.data.paragraphCount).toBe(6); // 2 direct + 4 in table cells
    expect(result.data.tableCount).toBe(1);
  });

  it("built DOCX can be read back with runInfo", async () => {
    const specPath = await writeSpecFile("build-info.json", {
      output: "info-test.docx",
      content: [
        { type: "paragraph", runs: [{ text: "Para 1" }] },
        { type: "paragraph", runs: [{ text: "Para 2" }] },
        {
          type: "table",
          rows: [{
            cells: [{ content: [{ type: "paragraph", runs: [{ text: "Cell" }] }] }],
          }],
        },
      ],
      styles: [{ type: "paragraph", styleId: "TestStyle", name: "Test Style" }],
    });

    await runBuild(specPath);

    const infoResult = await runInfo(path.join(tmpDir, "info-test.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }

    expect(infoResult.data.paragraphCount).toBe(2); // runInfo counts top-level only
    expect(infoResult.data.tableCount).toBe(1);
    expect(infoResult.data.hasStyles).toBe(true);
  });

  it("built DOCX can be read back with runExtract", async () => {
    const specPath = await writeSpecFile("build-extract.json", {
      output: "extract-test.docx",
      content: [
        { type: "paragraph", runs: [{ text: "First paragraph" }] },
        { type: "paragraph", runs: [{ text: "Second paragraph" }] },
      ],
    });

    await runBuild(specPath);

    const extractResult = await runExtract(path.join(tmpDir, "extract-test.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("First paragraph");
    expect(text).toContain("Second paragraph");
  });

  it("returns FILE_NOT_FOUND for missing spec file", async () => {
    const result = await runBuild(path.join(tmpDir, "nonexistent.json"));

    expect(result.success).toBe(false);
    if (result.success) { return; }

    expect(result.error.code).toBe("FILE_NOT_FOUND");
  });

  it("returns INVALID_JSON for malformed JSON", async () => {
    const badPath = path.join(tmpDir, "bad.json");
    await fs.writeFile(badPath, "{not valid json!!!");

    const result = await runBuild(badPath);

    expect(result.success).toBe(false);
    if (result.success) { return; }

    expect(result.error.code).toBe("INVALID_JSON");
  });

  it("builds with section properties", async () => {
    const specPath = await writeSpecFile("build-section.json", {
      output: "section-test.docx",
      content: [
        { type: "paragraph", runs: [{ text: "Content" }] },
      ],
      section: {
        pageSize: { w: 12240, h: 15840 },
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    });

    await runBuild(specPath);

    const infoResult = await runInfo(path.join(tmpDir, "section-test.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }

    expect(infoResult.data.pageSize).toBeDefined();
    expect(infoResult.data.pageSize!.widthTwips).toBe(12240);
    expect(infoResult.data.pageSize!.heightTwips).toBe(15840);
  });

  it("builds with numbering definitions", async () => {
    const specPath = await writeSpecFile("build-numbering.json", {
      output: "numbering-test.docx",
      content: [
        {
          type: "paragraph",
          numbering: { numId: 1, ilvl: 0 },
          runs: [{ text: "Item 1" }],
        },
        {
          type: "paragraph",
          numbering: { numId: 1, ilvl: 0 },
          runs: [{ text: "Item 2" }],
        },
      ],
      numbering: [
        {
          abstractNumId: 0,
          numId: 1,
          levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }],
        },
      ],
    });

    await runBuild(specPath);

    const infoResult = await runInfo(path.join(tmpDir, "numbering-test.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }

    expect(infoResult.data.hasNumbering).toBe(true);
  });
});

// =============================================================================
// runPatch Tests
// =============================================================================

describe("runPatch", () => {
  async function buildSource(name: string, spec: object): Promise<string> {
    const specPath = await writeSpecFile(`build-${name}.json`, {
      output: `${name}.docx`,
      ...spec,
    });
    const result = await runBuild(specPath);
    expect(result.success).toBe(true);
    return path.join(tmpDir, `${name}.docx`);
  }

  it("patches text in a built DOCX via text.replace", async () => {
    const sourcePath = await buildSource("patch-text", {
      content: [
        { type: "paragraph", runs: [{ text: "Hello {{NAME}}, welcome!" }] },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-text.json", {
      source: path.basename(sourcePath),
      output: "patched-text.docx",
      patches: [
        { type: "text.replace", search: "{{NAME}}", replace: "Alice" },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);
    if (!result.success) { return; }

    expect(result.data.patchCount).toBe(1);

    const extractResult = await runExtract(path.join(tmpDir, "patched-text.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("Hello Alice, welcome!");
    expect(text).not.toContain("{{NAME}}");
  });

  it("patches content by appending paragraphs", async () => {
    const sourcePath = await buildSource("patch-append", {
      content: [
        { type: "paragraph", runs: [{ text: "Original" }] },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-append.json", {
      source: path.basename(sourcePath),
      output: "patched-append.docx",
      patches: [
        {
          type: "content.append",
          content: [
            { type: "paragraph", runs: [{ text: "Appended paragraph" }] },
          ],
        },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const extractResult = await runExtract(path.join(tmpDir, "patched-append.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("Original");
    expect(text).toContain("Appended paragraph");
  });

  it("patches content by inserting at index", async () => {
    const sourcePath = await buildSource("patch-insert", {
      content: [
        { type: "paragraph", runs: [{ text: "First" }] },
        { type: "paragraph", runs: [{ text: "Third" }] },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-insert.json", {
      source: path.basename(sourcePath),
      output: "patched-insert.docx",
      patches: [
        {
          type: "content.insert",
          index: 1,
          content: [
            { type: "paragraph", runs: [{ text: "Second (inserted)" }] },
          ],
        },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const infoResult = await runInfo(path.join(tmpDir, "patched-insert.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }
    expect(infoResult.data.paragraphCount).toBe(3);

    const extractResult = await runExtract(path.join(tmpDir, "patched-insert.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("Second (inserted)");
  });

  it("patches content by deleting", async () => {
    const sourcePath = await buildSource("patch-delete", {
      content: [
        { type: "paragraph", runs: [{ text: "Keep" }] },
        { type: "paragraph", runs: [{ text: "Delete me" }] },
        { type: "paragraph", runs: [{ text: "Also keep" }] },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-delete.json", {
      source: path.basename(sourcePath),
      output: "patched-delete.docx",
      patches: [
        { type: "content.delete", index: 1, count: 1 },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const infoResult = await runInfo(path.join(tmpDir, "patched-delete.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }
    expect(infoResult.data.paragraphCount).toBe(2);

    const extractResult = await runExtract(path.join(tmpDir, "patched-delete.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("Keep");
    expect(text).toContain("Also keep");
    expect(text).not.toContain("Delete me");
  });

  it("patches content by replacing", async () => {
    const sourcePath = await buildSource("patch-replace", {
      content: [
        { type: "paragraph", runs: [{ text: "Old paragraph" }] },
        { type: "paragraph", runs: [{ text: "Keep this" }] },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-replace.json", {
      source: path.basename(sourcePath),
      output: "patched-replace.docx",
      patches: [
        {
          type: "content.replace",
          index: 0,
          count: 1,
          content: [
            { type: "paragraph", runs: [{ text: "New paragraph" }] },
          ],
        },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const extractResult = await runExtract(path.join(tmpDir, "patched-replace.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("New paragraph");
    expect(text).toContain("Keep this");
    expect(text).not.toContain("Old paragraph");
  });

  it("patches text inside table cells", async () => {
    const sourcePath = await buildSource("patch-table-text", {
      content: [
        {
          type: "table",
          rows: [{
            cells: [
              { content: [{ type: "paragraph", runs: [{ text: "{{VAL}}" }] }] },
            ],
          }],
        },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-table-text.json", {
      source: path.basename(sourcePath),
      output: "patched-table-text.docx",
      patches: [
        { type: "text.replace", search: "{{VAL}}", replace: "Replaced!" },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const extractResult = await runExtract(path.join(tmpDir, "patched-table-text.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("Replaced!");
    expect(text).not.toContain("{{VAL}}");
  });

  it("adds styles to a document via styles.append", async () => {
    const sourcePath = await buildSource("patch-styles", {
      content: [
        { type: "paragraph", runs: [{ text: "Text" }] },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-styles.json", {
      source: path.basename(sourcePath),
      output: "patched-styles.docx",
      patches: [
        {
          type: "styles.append",
          styles: [
            { type: "paragraph", styleId: "CustomStyle", name: "Custom Style" },
          ],
        },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const infoResult = await runInfo(path.join(tmpDir, "patched-styles.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }
    expect(infoResult.data.hasStyles).toBe(true);
  });

  it("adds numbering to a document via numbering.append", async () => {
    const sourcePath = await buildSource("patch-numbering", {
      content: [
        { type: "paragraph", runs: [{ text: "Text" }] },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-numbering.json", {
      source: path.basename(sourcePath),
      output: "patched-numbering.docx",
      patches: [
        {
          type: "numbering.append",
          numbering: [
            {
              abstractNumId: 0,
              numId: 1,
              levels: [{ ilvl: 0, numFmt: "bullet", lvlText: "•" }],
            },
          ],
        },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const infoResult = await runInfo(path.join(tmpDir, "patched-numbering.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }
    expect(infoResult.data.hasNumbering).toBe(true);
  });

  it("updates section properties", async () => {
    const sourcePath = await buildSource("patch-section", {
      content: [
        { type: "paragraph", runs: [{ text: "Text" }] },
      ],
      section: {
        pageSize: { w: 12240, h: 15840 },
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    });

    const patchSpecPath = await writeSpecFile("patch-section.json", {
      source: path.basename(sourcePath),
      output: "patched-section.docx",
      patches: [
        {
          type: "section.update",
          section: {
            margins: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const infoResult = await runInfo(path.join(tmpDir, "patched-section.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }

    expect(infoResult.data.pageSize).toBeDefined();
  });

  it("applies multiple patches together", async () => {
    const sourcePath = await buildSource("patch-multi", {
      content: [
        { type: "paragraph", runs: [{ text: "Hello {{NAME}}" }] },
        { type: "paragraph", runs: [{ text: "Middle" }] },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-multi.json", {
      source: path.basename(sourcePath),
      output: "patched-multi.docx",
      patches: [
        { type: "text.replace", search: "{{NAME}}", replace: "World" },
        {
          type: "content.append",
          content: [
            { type: "paragraph", runs: [{ text: "Footer" }] },
          ],
        },
      ],
    });

    const result = await runPatch(patchSpecPath);
    expect(result.success).toBe(true);

    const infoResult = await runInfo(path.join(tmpDir, "patched-multi.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }
    expect(infoResult.data.paragraphCount).toBe(3);

    const extractResult = await runExtract(path.join(tmpDir, "patched-multi.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("Hello World");
    expect(text).toContain("Footer");
    expect(text).not.toContain("{{NAME}}");
  });

  it("returns FILE_NOT_FOUND for missing spec file", async () => {
    const result = await runPatch(path.join(tmpDir, "nonexistent.json"));

    expect(result.success).toBe(false);
    if (result.success) { return; }

    expect(result.error.code).toBe("FILE_NOT_FOUND");
  });

  it("returns INVALID_JSON for malformed spec", async () => {
    const badPath = path.join(tmpDir, "bad-patch.json");
    await fs.writeFile(badPath, "not json{{{");

    const result = await runPatch(badPath);

    expect(result.success).toBe(false);
    if (result.success) { return; }

    expect(result.error.code).toBe("INVALID_JSON");
  });

  it("returns FILE_NOT_FOUND for missing source DOCX", async () => {
    const patchSpecPath = await writeSpecFile("patch-missing-source.json", {
      source: "nonexistent-source.docx",
      output: "should-not-exist.docx",
      patches: [
        { type: "text.replace", search: "a", replace: "b" },
      ],
    });

    const result = await runPatch(patchSpecPath);

    expect(result.success).toBe(false);
    if (result.success) { return; }

    expect(result.error.code).toBe("FILE_NOT_FOUND");
  });

  it("preserves unmodified parts after patching", async () => {
    const sourcePath = await buildSource("patch-preserve", {
      content: [
        { type: "paragraph", runs: [{ text: "Original" }] },
      ],
      styles: [{ type: "paragraph", styleId: "MyStyle", name: "My Style" }],
      numbering: [
        {
          abstractNumId: 0,
          numId: 1,
          levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }],
        },
      ],
    });

    const patchSpecPath = await writeSpecFile("patch-preserve.json", {
      source: path.basename(sourcePath),
      output: "patched-preserve.docx",
      patches: [
        { type: "text.replace", search: "Original", replace: "Modified" },
      ],
    });

    await runPatch(patchSpecPath);

    const infoResult = await runInfo(path.join(tmpDir, "patched-preserve.docx"));
    expect(infoResult.success).toBe(true);
    if (!infoResult.success) { return; }

    expect(infoResult.data.hasStyles).toBe(true);
    expect(infoResult.data.hasNumbering).toBe(true);

    const extractResult = await runExtract(path.join(tmpDir, "patched-preserve.docx"), {});
    expect(extractResult.success).toBe(true);
    if (!extractResult.success) { return; }

    const text = extractResult.data.sections.map((s) => s.text).join("\n");
    expect(text).toContain("Modified");
    expect(text).not.toContain("Original");
  });
});
