/**
 * @file Patcher Tests
 *
 * Round-trip tests: buildDocx() → patchDocx() → loadDocx() → verify.
 */

// globals from vitest
import { buildDocx } from "./builder";
import { patchDocx, getPatchData } from "./patcher";
import { loadDocx } from "@aurochs-office/docx/document-parser";
import { exportDocx } from "@aurochs-office/docx/exporter";
import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxBuildSpec } from "./types";
import type { DocxPatchSpec } from "./patch-types";
import { extractTextFromBody } from "@aurochs-office/docx/domain/text-utils";
import { loadZipPackage } from "@aurochs/zip";

// =============================================================================
// Helpers
// =============================================================================

function createBasicSpec(content: DocxBuildSpec["content"], options: Partial<DocxBuildSpec> = {}): DocxBuildSpec {
  return {
    output: "test.docx",
    content,
    ...options,
  };
}

async function buildAndPatch(buildSpec: DocxBuildSpec, patches: DocxPatchSpec["patches"]): Promise<Uint8Array> {
  const source = await buildDocx(buildSpec);
  const patchSpec: DocxPatchSpec = {
    source: "test.docx",
    output: "patched.docx",
    patches,
  };
  return patchDocx(patchSpec, source);
}

// =============================================================================
// content.append
// =============================================================================

describe("content.append", () => {
  it("appends a paragraph to the end of the document", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Original" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "content.append",
        content: [{ type: "paragraph", runs: [{ text: "Appended" }] }],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(2);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Appended");
  });

  it("appends a table to the end", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Before table" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "content.append",
        content: [
          {
            type: "table",
            rows: [
              {
                cells: [
                  { content: [{ type: "paragraph", runs: [{ text: "Cell A" }] }] },
                  { content: [{ type: "paragraph", runs: [{ text: "Cell B" }] }] },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(2);
    expect(doc.body.content[1]!.type).toBe("table");
  });
});

// =============================================================================
// content.insert
// =============================================================================

describe("content.insert", () => {
  it("inserts at the beginning", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Second" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "content.insert",
        index: 0,
        content: [{ type: "paragraph", runs: [{ text: "First" }] }],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(2);
    const text = extractTextFromBody(doc.body);
    expect(text).toMatch(/First[\s\S]*Second/);
  });

  it("inserts in the middle", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "First" }] },
      { type: "paragraph", runs: [{ text: "Third" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "content.insert",
        index: 1,
        content: [{ type: "paragraph", runs: [{ text: "Second" }] }],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(3);
    const text = extractTextFromBody(doc.body);
    expect(text).toMatch(/First[\s\S]*Second[\s\S]*Third/);
  });

  it("throws on out-of-range index", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Only" }] },
    ]);

    const source = await buildDocx(spec);
    await expect(
      patchDocx(
        { source: "t.docx", output: "o.docx", patches: [{ type: "content.insert", index: 5, content: [{ type: "paragraph", runs: [{ text: "X" }] }] }] },
        source,
      ),
    ).rejects.toThrow("out of range");
  });
});

// =============================================================================
// content.delete
// =============================================================================

describe("content.delete", () => {
  it("deletes a single block", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Keep" }] },
      { type: "paragraph", runs: [{ text: "Delete me" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "content.delete", index: 1 },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(1);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Keep");
    expect(text).not.toContain("Delete me");
  });

  it("deletes multiple blocks", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "A" }] },
      { type: "paragraph", runs: [{ text: "B" }] },
      { type: "paragraph", runs: [{ text: "C" }] },
      { type: "paragraph", runs: [{ text: "D" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "content.delete", index: 1, count: 2 },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(2);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("A");
    expect(text).toContain("D");
    expect(text).not.toContain("B");
    expect(text).not.toContain("C");
  });

  it("throws on out-of-range delete", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Only" }] },
    ]);

    const source = await buildDocx(spec);
    await expect(
      patchDocx(
        { source: "t.docx", output: "o.docx", patches: [{ type: "content.delete", index: 5 }] },
        source,
      ),
    ).rejects.toThrow("out of range");
  });
});

// =============================================================================
// content.replace
// =============================================================================

describe("content.replace", () => {
  it("replaces a single block", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Old paragraph" }] },
      { type: "paragraph", runs: [{ text: "Keep" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "content.replace",
        index: 0,
        content: [{ type: "paragraph", runs: [{ text: "New paragraph" }] }],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(2);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("New paragraph");
    expect(text).not.toContain("Old paragraph");
    expect(text).toContain("Keep");
  });

  it("replaces with different count", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "A" }] },
      { type: "paragraph", runs: [{ text: "B" }] },
      { type: "paragraph", runs: [{ text: "C" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "content.replace",
        index: 0,
        count: 2,
        content: [{ type: "paragraph", runs: [{ text: "Replaced" }] }],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(2);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Replaced");
    expect(text).toContain("C");
    expect(text).not.toContain("A");
    expect(text).not.toContain("B");
  });
});

// =============================================================================
// text.replace
// =============================================================================

describe("text.replace", () => {
  it("replaces all occurrences by default", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Hello {{NAME}}, welcome {{NAME}}!" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "{{NAME}}", replace: "Alice" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Hello Alice, welcome Alice!");
    expect(text).not.toContain("{{NAME}}");
  });

  it("replaces only first occurrence when replaceAll is false", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "AAA" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "A", replace: "B", replaceAll: false },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("BAA");
  });

  it("replaces first occurrence only when replaceAll is false with multiple matches", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "cat and cat and cat" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "cat", replace: "dog", replaceAll: false },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("dog and cat and cat");
  });

  // ---------------------------------------------------------------------------
  // Emoji: BMP symbols (single UTF-16 code unit)
  // ---------------------------------------------------------------------------

  it("replaces BMP emoji (single code unit) in text", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "I ❤ TypeScript" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "❤", replace: "love" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("I love TypeScript");
  });

  // ---------------------------------------------------------------------------
  // Emoji: Surrogate pairs (two UTF-16 code units, U+1F600+)
  // ---------------------------------------------------------------------------

  it("replaces surrogate pair emoji (😀) with text", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Hello 😀 World" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "😀", replace: ":)" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Hello :) World");
  });

  it("replaces text with surrogate pair emoji", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Status: OK" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "OK", replace: "✅" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Status: ✅");
  });

  it("replaces emoji with different emoji (surrogate pair to surrogate pair)", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Rating: 👎" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "👎", replace: "👍" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Rating: 👍");
    expect(text).not.toContain("👎");
  });

  it("replaces multiple surrogate pair emoji with replaceAll", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "🔴 red 🔴 alert 🔴" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "🔴", replace: "🟢" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("🟢 red 🟢 alert 🟢");
    expect(text).not.toContain("🔴");
  });

  it("replaces only first surrogate pair emoji when replaceAll is false", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "🔴 first 🔴 second" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "🔴", replace: "🟢", replaceAll: false },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("🟢 first 🔴 second");
  });

  // ---------------------------------------------------------------------------
  // Emoji: ZWJ sequences (multiple code points joined by U+200D)
  // ---------------------------------------------------------------------------

  it("replaces ZWJ emoji sequence (family emoji)", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Family: 👨‍👩‍👧‍👦 here" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "👨‍👩‍👧‍👦", replace: "(family)" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Family: (family) here");
  });

  // ---------------------------------------------------------------------------
  // Emoji: Skin tone modifiers
  // ---------------------------------------------------------------------------

  it("replaces emoji with skin tone modifier", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Thumbs up: 👍🏽 done" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "👍🏽", replace: "(ok)" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Thumbs up: (ok) done");
  });

  // ---------------------------------------------------------------------------
  // Emoji: Flag sequences (regional indicator pairs)
  // ---------------------------------------------------------------------------

  it("replaces flag emoji (regional indicator pair)", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Location: 🇯🇵 Tokyo" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "🇯🇵", replace: "Japan" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Location: Japan Tokyo");
  });

  // ---------------------------------------------------------------------------
  // Emoji: Keycap sequences
  // ---------------------------------------------------------------------------

  it("replaces keycap emoji sequence", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Dial 1️⃣ now" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "1️⃣", replace: "one" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Dial one now");
  });

  // ---------------------------------------------------------------------------
  // CJK and other multi-byte characters
  // ---------------------------------------------------------------------------

  it("replaces CJK characters", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "こんにちは世界" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "世界", replace: "ワールド" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("こんにちはワールド");
  });

  it("replaces mixed ASCII and emoji text", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Price: 💰100💰 total" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "💰", replace: "$" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Price: $100$ total");
  });

  // ---------------------------------------------------------------------------
  // Combining characters (e.g., e + combining accent)
  // ---------------------------------------------------------------------------

  it("replaces precomposed accented character (NFC)", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "café latte" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "café", replace: "coffee" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("coffee latte");
  });

  it("replaces decomposed accented character (NFD: e + combining acute)", async () => {
    // NFD: "e" + U+0301 (combining acute accent) = "é"
    const nfdCafe = "caf\u0065\u0301 latte";
    const nfdSearch = "caf\u0065\u0301";
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: nfdCafe }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: nfdSearch, replace: "coffee" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("coffee latte");
  });

  // ---------------------------------------------------------------------------
  // Edge cases: adjacent emoji, emoji-only text
  // ---------------------------------------------------------------------------

  it("replaces in emoji-only text", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "🎉🎊🎉🎊" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "🎉", replace: "!" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("!🎊!🎊");
  });

  it("replaces text between surrogate-pair emoji", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "🚀launch🚀" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "launch", replace: "DEPLOY" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("🚀DEPLOY🚀");
  });

  it("replaces multi-emoji search pattern", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "signal: 🔴🟡🟢 go" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "🔴🟡🟢", replace: "green" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("signal: green go");
  });

  // ---------------------------------------------------------------------------
  // Emoji in table cells
  // ---------------------------------------------------------------------------

  it("replaces emoji inside table cells", async () => {
    const spec = createBasicSpec([
      {
        type: "table",
        rows: [
          {
            cells: [
              { content: [{ type: "paragraph", runs: [{ text: "{{VAL}}" }] }] },
            ],
          },
        ],
      },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "{{VAL}}", replace: "42" },
    ]);

    const doc = await loadDocx(patched);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("42");
    expect(text).not.toContain("{{VAL}}");
  });
});

// =============================================================================
// text.replace: paragraph content types (hyperlink, simpleField, sdt, revision)
// =============================================================================

describe("text.replace in paragraph content types", () => {
  async function exportAndPatch(doc: DocxDocument, patches: DocxPatchSpec["patches"]): Promise<DocxDocument> {
    const source = await exportDocx(doc);
    const patchSpec: DocxPatchSpec = {
      source: "test.docx",
      output: "patched.docx",
      patches,
    };
    const patched = await patchDocx(patchSpec, source);
    return loadDocx(patched);
  }

  it("replaces text inside hyperlink runs", async () => {
    const doc: DocxDocument = {
      body: {
        content: [
          {
            type: "paragraph",
            content: [
              { type: "run", content: [{ type: "text", value: "Visit " }] },
              {
                type: "hyperlink",
                anchor: "section1",
                content: [{ type: "run", content: [{ type: "text", value: "{{LINK_TEXT}}" }] }],
              },
              { type: "run", content: [{ type: "text", value: " now" }] },
            ],
          },
        ],
      },
    };

    const result = await exportAndPatch(doc, [
      { type: "text.replace", search: "{{LINK_TEXT}}", replace: "our docs" },
    ]);

    const text = extractTextFromBody(result.body);
    expect(text).toContain("Visit our docs now");
    expect(text).not.toContain("{{LINK_TEXT}}");
  });

  it("replaces text inside simpleField runs", async () => {
    const doc: DocxDocument = {
      body: {
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "simpleField",
                instr: "PAGE",
                content: [{ type: "run", content: [{ type: "text", value: "{{FIELD}}" }] }],
              },
            ],
          },
        ],
      },
    };

    const result = await exportAndPatch(doc, [
      { type: "text.replace", search: "{{FIELD}}", replace: "42" },
    ]);

    const para = result.body.content[0] as DocxParagraph;
    const sf = para.content.find((c) => c.type === "simpleField");
    expect(sf).toBeDefined();
    if (sf && sf.type === "simpleField") {
      const sfText = sf.content.map((r) => r.content.map((c) => c.type === "text" ? c.value : "").join("")).join("");
      expect(sfText).toBe("42");
    }
  });

  it("replaces text inside inline SDT runs", async () => {
    const doc: DocxDocument = {
      body: {
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "sdt",
                content: [{ type: "run", content: [{ type: "text", value: "{{SDT_VALUE}}" }] }],
              },
            ],
          },
        ],
      },
    };

    const result = await exportAndPatch(doc, [
      { type: "text.replace", search: "{{SDT_VALUE}}", replace: "replaced" },
    ]);

    const para = result.body.content[0] as DocxParagraph;
    const sdt = para.content.find((c) => c.type === "sdt");
    expect(sdt).toBeDefined();
    if (sdt && sdt.type === "sdt") {
      const sdtText = sdt.content.map((r) => r.content.map((c) => c.type === "text" ? c.value : "").join("")).join("");
      expect(sdtText).toBe("replaced");
    }
  });

  it("replaces text inside inserted revision content", async () => {
    const doc: DocxDocument = {
      body: {
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "ins",
                revision: { id: "1", author: "Test" },
                content: [{ type: "run", content: [{ type: "text", value: "{{INS_TEXT}}" }] }],
              },
            ],
          },
        ],
      },
    };

    const result = await exportAndPatch(doc, [
      { type: "text.replace", search: "{{INS_TEXT}}", replace: "inserted" },
    ]);

    const para = result.body.content[0] as DocxParagraph;
    const ins = para.content.find((c) => c.type === "ins");
    expect(ins).toBeDefined();
    if (ins && ins.type === "ins") {
      const insText = ins.content.map((r) => r.content.map((c) => c.type === "text" ? c.value : "").join("")).join("");
      expect(insText).toBe("inserted");
    }
  });

  it("replaces text inside deleted revision content", async () => {
    const doc: DocxDocument = {
      body: {
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "del",
                revision: { id: "2", author: "Test" },
                content: [{ type: "run", content: [{ type: "text", value: "{{DEL_TEXT}}" }] }],
              },
            ],
          },
        ],
      },
    };

    const result = await exportAndPatch(doc, [
      { type: "text.replace", search: "{{DEL_TEXT}}", replace: "deleted" },
    ]);

    const para = result.body.content[0] as DocxParagraph;
    const del = para.content.find((c) => c.type === "del");
    expect(del).toBeDefined();
    if (del && del.type === "del") {
      const delText = del.content.map((r) => r.content.map((c) => c.type === "text" ? c.value : "").join("")).join("");
      expect(delText).toBe("deleted");
    }
  });

  it("replaces text in multiple paragraph content types simultaneously", async () => {
    const doc: DocxDocument = {
      body: {
        content: [
          {
            type: "paragraph",
            content: [
              { type: "run", content: [{ type: "text", value: "Normal {{A}}" }] },
              {
                type: "hyperlink",
                anchor: "x",
                content: [{ type: "run", content: [{ type: "text", value: "Link {{A}}" }] }],
              },
              {
                type: "ins",
                revision: { id: "1", author: "Test" },
                content: [{ type: "run", content: [{ type: "text", value: "Ins {{A}}" }] }],
              },
            ],
          },
        ],
      },
    };

    const result = await exportAndPatch(doc, [
      { type: "text.replace", search: "{{A}}", replace: "OK" },
    ]);

    const text = extractTextFromBody(result.body);
    expect(text).toContain("Normal OK");
    expect(text).toContain("Link OK");
    expect(text).not.toContain("{{A}}");
  });
});

// =============================================================================
// styles.append
// =============================================================================

describe("styles.append", () => {
  it("adds styles to a document without existing styles", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Text" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "styles.append",
        styles: [
          {
            type: "paragraph",
            styleId: "CustomHeading",
            name: "Custom Heading",
          },
        ],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.styles).toBeDefined();
    expect(doc.styles!.style.some((s) => String(s.styleId) === "CustomHeading")).toBe(true);
  });

  it("appends to existing styles", async () => {
    const spec = createBasicSpec(
      [{ type: "paragraph", runs: [{ text: "Text" }] }],
      {
        styles: [
          { type: "paragraph", styleId: "Existing", name: "Existing Style" },
        ],
      },
    );

    const patched = await buildAndPatch(spec, [
      {
        type: "styles.append",
        styles: [
          { type: "paragraph", styleId: "NewStyle", name: "New Style" },
        ],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.styles).toBeDefined();
    expect(doc.styles!.style.some((s) => String(s.styleId) === "Existing")).toBe(true);
    expect(doc.styles!.style.some((s) => String(s.styleId) === "NewStyle")).toBe(true);
  });
});

// =============================================================================
// numbering.append
// =============================================================================

describe("numbering.append", () => {
  it("adds numbering to a document without existing numbering", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Text" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "numbering.append",
        numbering: [
          {
            abstractNumId: 0,
            numId: 1,
            levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }],
          },
        ],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.numbering).toBeDefined();
    expect(doc.numbering!.num.length).toBe(1);
    expect(doc.numbering!.abstractNum.length).toBe(1);
  });

  it("appends to existing numbering", async () => {
    const spec = createBasicSpec(
      [{ type: "paragraph", runs: [{ text: "Text" }] }],
      {
        numbering: [
          {
            abstractNumId: 0,
            numId: 1,
            levels: [{ ilvl: 0, numFmt: "bullet", lvlText: "•" }],
          },
        ],
      },
    );

    const patched = await buildAndPatch(spec, [
      {
        type: "numbering.append",
        numbering: [
          {
            abstractNumId: 1,
            numId: 2,
            levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1." }],
          },
        ],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.numbering).toBeDefined();
    expect(doc.numbering!.num.length).toBe(2);
    expect(doc.numbering!.abstractNum.length).toBe(2);
  });
});

// =============================================================================
// section.update
// =============================================================================

describe("section.update", () => {
  it("updates section margins", async () => {
    const spec = createBasicSpec(
      [{ type: "paragraph", runs: [{ text: "Text" }] }],
      { section: { margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    );

    const patched = await buildAndPatch(spec, [
      {
        type: "section.update",
        section: { margins: { top: 720, right: 720, bottom: 720, left: 720 } },
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.sectPr).toBeDefined();
    expect(doc.body.sectPr!.pgMar).toBeDefined();
    expect(Number(doc.body.sectPr!.pgMar!.top)).toBe(720);
  });

  it("adds section properties to a document without existing section", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Text" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      {
        type: "section.update",
        section: { pageSize: { w: 12240, h: 15840 } },
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.sectPr).toBeDefined();
    expect(doc.body.sectPr!.pgSz).toBeDefined();
    expect(Number(doc.body.sectPr!.pgSz!.w)).toBe(12240);
  });
});

// =============================================================================
// Multiple Patches
// =============================================================================

describe("multiple patches", () => {
  it("applies content and text patches together", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Hello {{NAME}}" }] },
      { type: "paragraph", runs: [{ text: "Middle" }] },
    ]);

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "{{NAME}}", replace: "World" },
      {
        type: "content.append",
        content: [{ type: "paragraph", runs: [{ text: "Footer" }] }],
      },
    ]);

    const doc = await loadDocx(patched);
    expect(doc.body.content).toHaveLength(3);
    const text = extractTextFromBody(doc.body);
    expect(text).toContain("Hello World");
    expect(text).toContain("Footer");
  });
});

// =============================================================================
// Unmodified Parts Preservation
// =============================================================================

describe("unmodified parts", () => {
  it("preserves file count after patching", async () => {
    const spec = createBasicSpec(
      [{ type: "paragraph", runs: [{ text: "Original" }] }],
      {
        styles: [{ type: "paragraph", styleId: "MyStyle", name: "My Style" }],
      },
    );

    const source = await buildDocx(spec);
    const origPkg = await loadZipPackage(source);
    const origFiles = origPkg.listFiles();

    const patched = await buildAndPatch(spec, [
      { type: "text.replace", search: "Original", replace: "Modified" },
    ]);

    const patchedPkg = await loadZipPackage(patched);
    const patchedFiles = patchedPkg.listFiles();

    // File count should be equal (no files added or removed)
    expect(patchedFiles.length).toBe(origFiles.length);
  });
});

// =============================================================================
// getPatchData
// =============================================================================

describe("getPatchData", () => {
  it("returns correct metadata", () => {
    const spec: DocxPatchSpec = {
      source: "input.docx",
      output: "output.docx",
      patches: [
        {
          type: "content.append",
          content: [
            { type: "paragraph", runs: [{ text: "Para 1" }] },
            { type: "paragraph", runs: [{ text: "Para 2" }] },
          ],
        },
        { type: "text.replace", search: "a", replace: "b" },
        {
          type: "content.insert",
          index: 0,
          content: [
            {
              type: "table",
              rows: [
                {
                  cells: [
                    { content: [{ type: "paragraph", runs: [{ text: "Cell" }] }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const data = getPatchData(spec);
    expect(data.sourcePath).toBe("input.docx");
    expect(data.outputPath).toBe("output.docx");
    expect(data.patchCount).toBe(3);
    expect(data.paragraphCount).toBe(3); // 2 direct + 1 in table cell
    expect(data.tableCount).toBe(1);
  });
});

// =============================================================================
// Exhaustive switch error
// =============================================================================

describe("unknown patch type", () => {
  it("throws on unknown patch type", async () => {
    const spec = createBasicSpec([
      { type: "paragraph", runs: [{ text: "Text" }] },
    ]);

    const source = await buildDocx(spec);
    await expect(
      patchDocx(
        {
          source: "t.docx",
          output: "o.docx",
          patches: [{ type: "unknown.type" } as never],
        },
        source,
      ),
    ).rejects.toThrow("Unknown patch type");
  });
});
