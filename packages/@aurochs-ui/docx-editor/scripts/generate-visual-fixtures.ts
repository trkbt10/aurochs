/**
 * @file Generate DOCX fixtures for visual regression testing
 *
 * Creates test document data that can be rendered by the DOCX editor
 * for visual regression testing.
 *
 * Usage:
 *   bun packages/@aurochs-ui/docx-editor/scripts/generate-visual-fixtures.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { DocxParagraph, DocxRun, DocxNumbering, DocxSectionProperties, DocxBreak } from "@aurochs-office/docx/domain";
import { twips, halfPoints, docxNumId, docxIlvl, docxAbstractNumId } from "@aurochs-office/docx/domain";
import { eighthPt } from "@aurochs-office/ooxml/domain/border";

// =============================================================================
// Types
// =============================================================================

type DocumentData = {
  paragraphs: DocxParagraph[];
  numbering?: DocxNumbering;
  sectPr?: DocxSectionProperties;
};

// =============================================================================
// Helpers
// =============================================================================

function textRun(text: string, props?: DocxRun["properties"]): DocxRun {
  return {
    type: "run",
    content: [{ type: "text", value: text }],
    properties: props,
  };
}

function paragraph(runs: DocxRun[], props?: DocxParagraph["properties"]): DocxParagraph {
  return {
    content: runs,
    properties: props,
  };
}

// =============================================================================
// Test Documents
// =============================================================================

function createBoldItalicDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Bold and Italic Text Formatting", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([
        textRun("This is "),
        textRun("bold", { bold: true }),
        textRun(" text."),
      ]),
      paragraph([
        textRun("This is "),
        textRun("italic", { italic: true }),
        textRun(" text."),
      ]),
      paragraph([
        textRun("This is "),
        textRun("bold and italic", { bold: true, italic: true }),
        textRun(" text."),
      ]),
      paragraph([textRun("")]),
      paragraph([textRun("Normal text for comparison.")]),
    ],
  };
}

function createFontSizesDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Font Size Variations", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("8pt text", { fontSize: halfPoints(16) })]),
      paragraph([textRun("10pt text", { fontSize: halfPoints(20) })]),
      paragraph([textRun("12pt text (default)", { fontSize: halfPoints(24) })]),
      paragraph([textRun("14pt text", { fontSize: halfPoints(28) })]),
      paragraph([textRun("18pt text", { fontSize: halfPoints(36) })]),
      paragraph([textRun("24pt text", { fontSize: halfPoints(48) })]),
      paragraph([textRun("36pt text", { fontSize: halfPoints(72) })]),
    ],
  };
}

function createFontColorsDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Font Color Variations", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Red text", { color: { type: "rgb", value: "FF0000" } })]),
      paragraph([textRun("Green text", { color: { type: "rgb", value: "00FF00" } })]),
      paragraph([textRun("Blue text", { color: { type: "rgb", value: "0000FF" } })]),
      paragraph([textRun("Orange text", { color: { type: "rgb", value: "FFA500" } })]),
      paragraph([textRun("Purple text", { color: { type: "rgb", value: "800080" } })]),
      paragraph([textRun("Dark gray text", { color: { type: "rgb", value: "404040" } })]),
    ],
  };
}

function createUnderlineStylesDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Underline Styles", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Single underline", { underline: { val: "single" } })]),
      paragraph([textRun("Double underline", { underline: { val: "double" } })]),
      paragraph([textRun("Dotted underline", { underline: { val: "dotted" } })]),
      paragraph([textRun("Dashed underline", { underline: { val: "dash" } })]),
      paragraph([textRun("Wavy underline", { underline: { val: "wave" } })]),
      paragraph([textRun("Thick underline", { underline: { val: "thick" } })]),
    ],
  };
}

function createStrikethroughDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Strikethrough Styles", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Single strikethrough", { strike: true })]),
      paragraph([textRun("Double strikethrough", { dstrike: true })]),
      paragraph([textRun("")]),
      paragraph([
        textRun("Mix: "),
        textRun("strike", { strike: true }),
        textRun(" and "),
        textRun("underline", { underline: { val: "single" } }),
      ]),
    ],
  };
}

function createSuperscriptSubscriptDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Superscript and Subscript", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([
        textRun("H"),
        textRun("2", { vertAlign: "subscript" }),
        textRun("O (water)"),
      ]),
      paragraph([
        textRun("E = mc"),
        textRun("2", { vertAlign: "superscript" }),
        textRun(" (Einstein's equation)"),
      ]),
      paragraph([
        textRun("x"),
        textRun("2", { vertAlign: "superscript" }),
        textRun(" + y"),
        textRun("2", { vertAlign: "superscript" }),
        textRun(" = z"),
        textRun("2", { vertAlign: "superscript" }),
      ]),
    ],
  };
}

function createHighlightingDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Highlight Colors", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Yellow highlight", { highlight: "yellow" })]),
      paragraph([textRun("Green highlight", { highlight: "green" })]),
      paragraph([textRun("Cyan highlight", { highlight: "cyan" })]),
      paragraph([textRun("Magenta highlight", { highlight: "magenta" })]),
      paragraph([textRun("Red highlight", { highlight: "red" })]),
      paragraph([textRun("Blue highlight", { highlight: "blue" })]),
    ],
  };
}

function createAlignmentDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Paragraph Alignment", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Left aligned text. This is the default alignment for most documents.")],
        { alignment: "left" }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Center aligned text. Often used for titles and headings.")],
        { alignment: "center" }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Right aligned text. Used for dates, signatures, and specific layouts.")],
        { alignment: "right" }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Justified text spreads words evenly across the line. This is commonly used in newspapers, magazines, and formal documents to create clean edges on both sides of the text block.")],
        { alignment: "both" }
      ),
    ],
  };
}

function createSpacingDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Paragraph Spacing", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Paragraph with 12pt spacing before.")],
        { spacing: { before: twips(240) } }
      ),
      paragraph(
        [textRun("Paragraph with 12pt spacing after.")],
        { spacing: { after: twips(240) } }
      ),
      paragraph(
        [textRun("Paragraph with 24pt spacing before and after.")],
        { spacing: { before: twips(480), after: twips(480) } }
      ),
      paragraph([textRun("Normal paragraph for comparison.")]),
      paragraph(
        [textRun("Line 1 with 1.5 line spacing."), { type: "break", breakType: "textWrapping" } satisfies DocxBreak, textRun("Line 2 continues here."), { type: "break", breakType: "textWrapping" } satisfies DocxBreak, textRun("Line 3 ends the example.")],
        { spacing: { line: twips(360), lineRule: "auto" } }
      ),
    ],
  };
}

function createIndentationDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Paragraph Indentation", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Normal paragraph with no indentation.")]),
      paragraph(
        [textRun("Left indent of 0.5 inch. This paragraph is indented from the left margin.")],
        { ind: { left: twips(720) } }
      ),
      paragraph(
        [textRun("Right indent of 0.5 inch. This paragraph is indented from the right margin.")],
        { ind: { right: twips(720) } }
      ),
      paragraph(
        [textRun("First line indent of 0.5 inch. Only the first line is indented, subsequent lines wrap normally.")],
        { ind: { firstLine: twips(720) } }
      ),
      paragraph(
        [textRun("Hanging indent of 0.5 inch. The first line starts at the margin, but subsequent lines are indented. This is commonly used for bibliographies and numbered lists.")],
        { ind: { left: twips(720), hanging: twips(720) } }
      ),
    ],
  };
}

function createBulletListDocument(): DocumentData {
  const numbering: DocxNumbering = {
    abstractNum: [
      {
        abstractNumId: docxAbstractNumId(0),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "bullet",
            lvlText: { val: "\u2022" },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
    ],
    num: [
      { numId: docxNumId(1), abstractNumId: docxAbstractNumId(0) },
    ],
  };

  return {
    paragraphs: [
      paragraph([textRun("Bullet List", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("First bullet item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second bullet item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Third bullet item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Fourth bullet item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Fifth bullet item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
    ],
    numbering,
  };
}

function createNumberedListDocument(): DocumentData {
  const numbering: DocxNumbering = {
    abstractNum: [
      {
        abstractNumId: docxAbstractNumId(0),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "decimal",
            lvlText: { val: "%1." },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
    ],
    num: [
      { numId: docxNumId(1), abstractNumId: docxAbstractNumId(0) },
    ],
  };

  return {
    paragraphs: [
      paragraph([textRun("Numbered List", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("First numbered item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second numbered item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Third numbered item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Fourth numbered item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Fifth numbered item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
    ],
    numbering,
  };
}

function createParagraphBordersDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Paragraph Borders", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Box border around paragraph.")],
        {
          pBdr: {
            top: { val: "single", sz: eighthPt(8), color: "000000" },
            bottom: { val: "single", sz: eighthPt(8), color: "000000" },
            left: { val: "single", sz: eighthPt(8), color: "000000" },
            right: { val: "single", sz: eighthPt(8), color: "000000" },
          },
        }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Bottom border only (like a horizontal rule).")],
        {
          pBdr: {
            bottom: { val: "single", sz: eighthPt(12), color: "0000FF" },
          },
        }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Double border style.")],
        {
          pBdr: {
            top: { val: "double", sz: eighthPt(8), color: "FF0000" },
            bottom: { val: "double", sz: eighthPt(8), color: "FF0000" },
            left: { val: "double", sz: eighthPt(8), color: "FF0000" },
            right: { val: "double", sz: eighthPt(8), color: "FF0000" },
          },
        }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Dashed border style.")],
        {
          pBdr: {
            top: { val: "dashed", sz: eighthPt(8), color: "008000" },
            bottom: { val: "dashed", sz: eighthPt(8), color: "008000" },
            left: { val: "dashed", sz: eighthPt(8), color: "008000" },
            right: { val: "dashed", sz: eighthPt(8), color: "008000" },
          },
        }
      ),
    ],
  };
}

function createParagraphShadingDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Paragraph Shading", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Light gray background shading.")],
        {
          shd: { val: "clear", fill: "E0E0E0" },
        }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Yellow background shading.")],
        {
          shd: { val: "clear", fill: "FFFF00" },
        }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Light blue background shading.")],
        {
          shd: { val: "clear", fill: "ADD8E6" },
        }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Light green background shading.")],
        {
          shd: { val: "clear", fill: "90EE90" },
        }
      ),
      paragraph([textRun("")]),
      paragraph(
        [textRun("Light pink background shading.")],
        {
          shd: { val: "clear", fill: "FFB6C1" },
        }
      ),
    ],
  };
}

function createMultiLevelListDocument(): DocumentData {
  const numbering: DocxNumbering = {
    abstractNum: [
      {
        abstractNumId: docxAbstractNumId(0),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "decimal",
            lvlText: { val: "%1." },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
          {
            ilvl: docxIlvl(1),
            start: 1,
            numFmt: "lowerLetter",
            lvlText: { val: "%2." },
            lvlJc: "left",
            pPr: { ind: { left: twips(1440), hanging: twips(360) } },
          },
          {
            ilvl: docxIlvl(2),
            start: 1,
            numFmt: "lowerRoman",
            lvlText: { val: "%3." },
            lvlJc: "right",
            pPr: { ind: { left: twips(2160), hanging: twips(360) } },
          },
        ],
      },
    ],
    num: [
      { numId: docxNumId(1), abstractNumId: docxAbstractNumId(0) },
    ],
  };

  return {
    paragraphs: [
      paragraph([textRun("Multi-Level List", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("First level item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second level item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(1) } }),
      paragraph([textRun("Third level item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(2) } }),
      paragraph([textRun("Another third level")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(2) } }),
      paragraph([textRun("Back to second level")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(1) } }),
      paragraph([textRun("Back to first level")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Another first level")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
    ],
    numbering,
  };
}

function createFontFamiliesDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Font Families", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Arial font (default)", { rFonts: { ascii: "Arial", hAnsi: "Arial" } })]),
      paragraph([textRun("Times New Roman font", { rFonts: { ascii: "Times New Roman", hAnsi: "Times New Roman" } })]),
      paragraph([textRun("Courier New font (monospace)", { rFonts: { ascii: "Courier New", hAnsi: "Courier New" } })]),
      paragraph([textRun("Georgia font (serif)", { rFonts: { ascii: "Georgia", hAnsi: "Georgia" } })]),
      paragraph([textRun("Verdana font (sans-serif)", { rFonts: { ascii: "Verdana", hAnsi: "Verdana" } })]),
    ],
  };
}

function createCapsDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Capitalization Styles", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Normal text for comparison.")]),
      paragraph([textRun("All caps text style", { caps: true })]),
      paragraph([textRun("Small caps text style", { smallCaps: true })]),
      paragraph([textRun("")]),
      paragraph([
        textRun("Mixed: "),
        textRun("CAPS", { caps: true }),
        textRun(" and "),
        textRun("Small Caps", { smallCaps: true }),
        textRun(" in same line."),
      ]),
    ],
  };
}

function createLetterSpacingDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Letter Spacing", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Normal spacing (0)")]),
      paragraph([textRun("Expanded spacing (+2pt)", { spacing: twips(40) })]),
      paragraph([textRun("More expanded (+4pt)", { spacing: twips(80) })]),
      paragraph([textRun("Condensed spacing (-1pt)", { spacing: twips(-20) })]),
      paragraph([textRun("")]),
      paragraph([
        textRun("Mixed: "),
        textRun("expanded", { spacing: twips(60) }),
        textRun(" and "),
        textRun("condensed", { spacing: twips(-20) }),
        textRun(" text."),
      ]),
    ],
  };
}

function createMixedFormattingDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Mixed Formatting", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([
        textRun("Bold ", { bold: true }),
        textRun("and ", { italic: true }),
        textRun("italic ", { bold: true, italic: true }),
        textRun("combined.", {}),
      ]),
      paragraph([
        textRun("Red bold", { bold: true, color: { type: "rgb", value: "FF0000" } }),
        textRun(" with "),
        textRun("blue italic", { italic: true, color: { type: "rgb", value: "0000FF" } }),
        textRun("."),
      ]),
      paragraph([
        textRun("Large ", { fontSize: halfPoints(32) }),
        textRun("and ", { fontSize: halfPoints(24) }),
        textRun("small ", { fontSize: halfPoints(16) }),
        textRun("sizes."),
      ]),
      paragraph([
        textRun("Underlined ", { underline: { val: "single" } }),
        textRun("strikethrough ", { strike: true }),
        textRun("and highlighted", { highlight: "yellow" }),
        textRun("."),
      ]),
      paragraph([textRun("")]),
      paragraph([
        textRun("Complex: ", { bold: true, fontSize: halfPoints(28) }),
        textRun("Bold+Red+Large", { bold: true, color: { type: "rgb", value: "FF0000" }, fontSize: halfPoints(32) }),
        textRun(" mixed with "),
        textRun("Italic+Blue+Small", { italic: true, color: { type: "rgb", value: "0000FF" }, fontSize: halfPoints(18) }),
        textRun("."),
      ]),
    ],
  };
}

// =============================================================================
// ECMA-376 Coverage: Additional Run Properties
// =============================================================================

function createRunShadingDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Run-Level Shading", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([
        textRun("Normal text "),
        textRun("with yellow background", { shd: { val: "clear", fill: "FFFF00" } }),
        textRun(" continues."),
      ]),
      paragraph([
        textRun("Light blue ", { shd: { val: "clear", fill: "ADD8E6" } }),
        textRun("and "),
        textRun("light green ", { shd: { val: "clear", fill: "90EE90" } }),
        textRun("shading."),
      ]),
      paragraph([
        textRun("Combined: ", { bold: true }),
        textRun("Bold+Shaded", { bold: true, shd: { val: "clear", fill: "FFB6C1" } }),
        textRun(" text."),
      ]),
    ],
  };
}

function createTabStopsDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Tab Stops", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([
        { type: "run", content: [{ type: "text", value: "Left" }, { type: "tab" }], properties: {} },
        { type: "run", content: [{ type: "text", value: "Center" }, { type: "tab" }], properties: {} },
        { type: "run", content: [{ type: "text", value: "Right" }], properties: {} },
      ] as DocxRun[], {
        tabs: {
          tabs: [
            { val: "left", pos: twips(1440) },
            { val: "center", pos: twips(4320) },
            { val: "right", pos: twips(7200) },
          ],
        },
      }),
      paragraph([textRun("")]),
      paragraph([
        { type: "run", content: [{ type: "text", value: "Item" }, { type: "tab" }], properties: {} },
        { type: "run", content: [{ type: "text", value: "Price" }], properties: {} },
      ] as DocxRun[], {
        tabs: {
          tabs: [
            { val: "right", pos: twips(7200), leader: "dot" },
          ],
        },
      }),
      paragraph([
        { type: "run", content: [{ type: "text", value: "Apple" }, { type: "tab" }], properties: {} },
        { type: "run", content: [{ type: "text", value: "$1.50" }], properties: {} },
      ] as DocxRun[], {
        tabs: {
          tabs: [
            { val: "right", pos: twips(7200), leader: "dot" },
          ],
        },
      }),
      paragraph([
        { type: "run", content: [{ type: "text", value: "Orange" }, { type: "tab" }], properties: {} },
        { type: "run", content: [{ type: "text", value: "$2.00" }], properties: {} },
      ] as DocxRun[], {
        tabs: {
          tabs: [
            { val: "right", pos: twips(7200), leader: "dot" },
          ],
        },
      }),
    ],
  };
}

// =============================================================================
// ECMA-376 Coverage: Additional Numbering Formats
// =============================================================================

function createRomanNumeralsDocument(): DocumentData {
  const numbering: DocxNumbering = {
    abstractNum: [
      {
        abstractNumId: docxAbstractNumId(0),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "upperRoman",
            lvlText: { val: "%1." },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
      {
        abstractNumId: docxAbstractNumId(1),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "lowerRoman",
            lvlText: { val: "%1." },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
    ],
    num: [
      { numId: docxNumId(1), abstractNumId: docxAbstractNumId(0) },
      { numId: docxNumId(2), abstractNumId: docxAbstractNumId(1) },
    ],
  };

  return {
    paragraphs: [
      paragraph([textRun("Roman Numerals", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Upper Roman (I, II, III...):")]),
      paragraph([textRun("First item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Third item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("")]),
      paragraph([textRun("Lower Roman (i, ii, iii...):")]),
      paragraph([textRun("First item")], { numPr: { numId: docxNumId(2), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second item")], { numPr: { numId: docxNumId(2), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Third item")], { numPr: { numId: docxNumId(2), ilvl: docxIlvl(0) } }),
    ],
    numbering,
  };
}

function createLetterListsDocument(): DocumentData {
  const numbering: DocxNumbering = {
    abstractNum: [
      {
        abstractNumId: docxAbstractNumId(0),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "upperLetter",
            lvlText: { val: "%1." },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
      {
        abstractNumId: docxAbstractNumId(1),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "lowerLetter",
            lvlText: { val: "%1)" },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
    ],
    num: [
      { numId: docxNumId(1), abstractNumId: docxAbstractNumId(0) },
      { numId: docxNumId(2), abstractNumId: docxAbstractNumId(1) },
    ],
  };

  return {
    paragraphs: [
      paragraph([textRun("Letter Lists", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Upper Letter (A, B, C...):")]),
      paragraph([textRun("First item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Third item")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("")]),
      paragraph([textRun("Lower Letter (a, b, c...):")]),
      paragraph([textRun("First item")], { numPr: { numId: docxNumId(2), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second item")], { numPr: { numId: docxNumId(2), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Third item")], { numPr: { numId: docxNumId(2), ilvl: docxIlvl(0) } }),
    ],
    numbering,
  };
}

function createCustomBulletsDocument(): DocumentData {
  const numbering: DocxNumbering = {
    abstractNum: [
      {
        abstractNumId: docxAbstractNumId(0),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "bullet",
            lvlText: { val: "→" },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
      {
        abstractNumId: docxAbstractNumId(1),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "bullet",
            lvlText: { val: "★" },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
      {
        abstractNumId: docxAbstractNumId(2),
        lvl: [
          {
            ilvl: docxIlvl(0),
            start: 1,
            numFmt: "bullet",
            lvlText: { val: "✓" },
            lvlJc: "left",
            pPr: { ind: { left: twips(720), hanging: twips(360) } },
          },
        ],
      },
    ],
    num: [
      { numId: docxNumId(1), abstractNumId: docxAbstractNumId(0) },
      { numId: docxNumId(2), abstractNumId: docxAbstractNumId(1) },
      { numId: docxNumId(3), abstractNumId: docxAbstractNumId(2) },
    ],
  };

  return {
    paragraphs: [
      paragraph([textRun("Custom Bullets", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("Arrow bullets:")]),
      paragraph([textRun("First arrow")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second arrow")], { numPr: { numId: docxNumId(1), ilvl: docxIlvl(0) } }),
      paragraph([textRun("")]),
      paragraph([textRun("Star bullets:")]),
      paragraph([textRun("First star")], { numPr: { numId: docxNumId(2), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second star")], { numPr: { numId: docxNumId(2), ilvl: docxIlvl(0) } }),
      paragraph([textRun("")]),
      paragraph([textRun("Checkmark bullets:")]),
      paragraph([textRun("First check")], { numPr: { numId: docxNumId(3), ilvl: docxIlvl(0) } }),
      paragraph([textRun("Second check")], { numPr: { numId: docxNumId(3), ilvl: docxIlvl(0) } }),
    ],
    numbering,
  };
}

// =============================================================================
// ECMA-376 Coverage: Section Properties
// =============================================================================

function createPageSizeDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Page Size Test", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("This document tests page size rendering.")]),
      paragraph([textRun("Default: US Letter (8.5\" x 11\")")]),
      paragraph([textRun("")]),
      paragraph([textRun("Page dimensions should be visible in the rendered output.")]),
    ],
    sectPr: {
      pgSz: {
        w: twips(12240), // 8.5 inches
        h: twips(15840), // 11 inches
      },
      pgMar: {
        top: twips(1440),
        right: twips(1440),
        bottom: twips(1440),
        left: twips(1440),
      },
    },
  };
}

function createPageMarginsDocument(): DocumentData {
  return {
    paragraphs: [
      paragraph([textRun("Page Margins Test", { bold: true, fontSize: halfPoints(28) })]),
      paragraph([textRun("")]),
      paragraph([textRun("This document has wide margins (1.5 inches all around).")]),
      paragraph([textRun("")]),
      paragraph([textRun("The text area should be narrower than default.")]),
      paragraph([textRun("")]),
      paragraph([textRun("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.")]),
    ],
    sectPr: {
      pgSz: {
        w: twips(12240),
        h: twips(15840),
      },
      pgMar: {
        top: twips(2160), // 1.5 inches
        right: twips(2160),
        bottom: twips(2160),
        left: twips(2160),
      },
    },
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const fixturesDir = path.resolve(__dirname, "../fixtures/visual");
  const jsonDir = path.join(fixturesDir, "json");

  // Ensure directories exist
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }

  // Generate documents
  const documents = [
    // Text formatting
    { name: "bold-italic", document: createBoldItalicDocument() },
    { name: "font-sizes", document: createFontSizesDocument() },
    { name: "font-colors", document: createFontColorsDocument() },
    { name: "underline-styles", document: createUnderlineStylesDocument() },
    { name: "strikethrough", document: createStrikethroughDocument() },
    { name: "superscript-subscript", document: createSuperscriptSubscriptDocument() },
    { name: "highlighting", document: createHighlightingDocument() },
    // Paragraph formatting
    { name: "alignment", document: createAlignmentDocument() },
    { name: "spacing", document: createSpacingDocument() },
    { name: "indentation", document: createIndentationDocument() },
    // Lists
    { name: "bullet-list", document: createBulletListDocument() },
    { name: "numbered-list", document: createNumberedListDocument() },
    { name: "multi-level-list", document: createMultiLevelListDocument() },
    // Borders and Shading
    { name: "paragraph-borders", document: createParagraphBordersDocument() },
    { name: "paragraph-shading", document: createParagraphShadingDocument() },
    // Additional Text Formatting
    { name: "font-families", document: createFontFamiliesDocument() },
    { name: "caps", document: createCapsDocument() },
    { name: "letter-spacing", document: createLetterSpacingDocument() },
    { name: "mixed-formatting", document: createMixedFormattingDocument() },
    // ECMA-376 Coverage: Run Properties
    { name: "run-shading", document: createRunShadingDocument() },
    { name: "tab-stops", document: createTabStopsDocument() },
    // ECMA-376 Coverage: Numbering Formats
    { name: "roman-numerals", document: createRomanNumeralsDocument() },
    { name: "letter-lists", document: createLetterListsDocument() },
    { name: "custom-bullets", document: createCustomBulletsDocument() },
    // ECMA-376 Coverage: Section Properties
    { name: "page-size", document: createPageSizeDocument() },
    { name: "page-margins", document: createPageMarginsDocument() },
  ];

  console.log("Generating DOCX fixtures for visual regression testing...\n");

  for (const { name, document } of documents) {
    const jsonPath = path.join(jsonDir, `${name}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2));
    console.log(`  Created: ${jsonPath}`);
  }

  console.log(`
========================================
FIXTURE GENERATION COMPLETE
========================================

Generated: ${documents.length} document fixtures

JSON fixtures saved to: ${jsonDir}

Next steps:
1. Generate baselines:
   bun packages/@aurochs-ui/docx-editor/scripts/generate-editor-baselines.ts

2. Run visual tests:
   npx vitest run packages/@aurochs-ui/docx-editor/spec/docx-visual.spec.ts
`);
}

main().catch(console.error);
