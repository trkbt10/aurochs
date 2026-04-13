/**
 * @file E2E test for TextEditController copy-paste style preservation
 *
 * Verifies the reported bug: when text has multiple styles across paragraphs,
 * copying text from one paragraph and pasting it should preserve the copied
 * text's style, not apply the first paragraph's style.
 *
 * Test harness layout:
 *   Paragraph 1: "Aurochs"                  — STYLE_A (bold, 24pt, red)
 *   Paragraph 2: "Office Document Toolkit"   — STYLE_B (italic, 12pt, blue)
 *
 * The hidden textarea contains: "Aurochs\nOffice Document Toolkit"
 */

import { test, expect, type Page } from "@playwright/test";

// =============================================================================
// Helpers
// =============================================================================

/** Wait for the TextEditController to render and focus its hidden textarea. */
async function waitForTextarea(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const textareas = Array.from(document.querySelectorAll("textarea"));
      const hidden = textareas.find((ta) => {
        const style = window.getComputedStyle(ta);
        return style.opacity === "0";
      });
      return hidden && document.activeElement === hidden;
    },
    { timeout: 10_000 },
  );
  await page.waitForTimeout(200);
}

/** Get the hidden textarea value. */
async function getTextareaValue(page: Page): Promise<string> {
  return page.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    const hidden = textareas.find((ta) => {
      const style = window.getComputedStyle(ta);
      return style.opacity === "0";
    });
    return hidden?.value ?? "";
  });
}

/** Get the hidden textarea selection range. */
async function getSelection(page: Page): Promise<{ start: number; end: number }> {
  return page.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    const hidden = textareas.find((ta) => {
      const style = window.getComputedStyle(ta);
      return style.opacity === "0";
    });
    return {
      start: hidden?.selectionStart ?? 0,
      end: hidden?.selectionEnd ?? 0,
    };
  });
}

/** Focus the hidden textarea. */
async function focusTextarea(page: Page): Promise<void> {
  await page.evaluate(() => {
    const textareas = Array.from(document.querySelectorAll("textarea"));
    const hidden = textareas.find((ta) => {
      const style = window.getComputedStyle(ta);
      return style.opacity === "0";
    });
    hidden?.focus();
  });
}

/** Set the textarea selection range. */
async function setSelection(page: Page, start: number, end: number): Promise<void> {
  await page.evaluate(
    ({ s, e }) => {
      const textareas = Array.from(document.querySelectorAll("textarea"));
      const hidden = textareas.find((ta) => {
        const style = window.getComputedStyle(ta);
        return style.opacity === "0";
      });
      hidden?.setSelectionRange(s, e);
    },
    { s: start, e: end },
  );
}

type RunDebug = {
  paragraph: number;
  text: string;
  properties: Record<string, unknown> | undefined;
};

/** Get the current runs from the TextBody via window.__getRunsDebug. */
async function getRuns(page: Page): Promise<RunDebug[]> {
  return page.evaluate(() => (window as unknown as { __getRunsDebug: () => RunDebug[] }).__getRunsDebug());
}

const MOD = process.platform === "darwin" ? "Meta" : "Control";

// =============================================================================
// Tests
// =============================================================================

test.describe("TextEditController copy-paste style preservation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForTextarea(page);
  });

  test("textarea renders with expected initial text", async ({ page }) => {
    const value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document Toolkit");
  });

  test("initial runs have correct styles", async ({ page }) => {
    const runs = await getRuns(page);
    expect(runs).toHaveLength(2);

    // Paragraph 1: "Aurochs" with STYLE_A
    expect(runs[0].text).toBe("Aurochs");
    expect(runs[0].properties?.bold).toBe(true);

    // Paragraph 2: "Office Document Toolkit" with STYLE_B
    expect(runs[1].text).toBe("Office Document Toolkit");
    expect(runs[1].properties?.italic).toBe(true);
  });

  test("typing at end of paragraph 2 inherits paragraph 2 style", async ({ page }) => {
    await focusTextarea(page);

    // Move cursor to end of text
    await page.keyboard.press("End");
    // On macOS, End moves to end of line. Use Cmd+End for end of text.
    await page.keyboard.press(`${MOD}+ArrowDown`);

    // Type a character
    await page.keyboard.type("X");
    await page.waitForTimeout(200);

    const runs = await getRuns(page);
    // "X" should inherit italic style from "Toolkit"'s last character
    const lastRun = runs[runs.length - 1];
    expect(lastRun.text).toContain("X");
    expect(lastRun.properties?.italic).toBe(true);
    // Must NOT have bold (that's paragraph 1's style)
    expect(lastRun.properties?.bold).toBeUndefined();
  });

  test("copy 'Document' from paragraph 2, paste at end — preserves paragraph 2 style", async ({ page }) => {
    await focusTextarea(page);

    // Text: "Aurochs\nOffice Document Toolkit"
    // "Document" is at positions 15-23 (0-indexed)
    // Paragraph 2 starts at position 8 (after "Aurochs\n")
    // Within paragraph 2: "Office Document Toolkit"
    //                       0123456789...
    // "Document" starts at offset 15 in the full text

    // Select "Document" (positions 15 to 23)
    await setSelection(page, 15, 23);
    await page.waitForTimeout(100);

    // Copy
    await page.keyboard.press(`${MOD}+c`);
    await page.waitForTimeout(200);

    // Move cursor to end of text
    await page.keyboard.press(`${MOD}+ArrowDown`);
    await page.waitForTimeout(100);

    // Paste
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    const value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document ToolkitDocument");

    const runs = await getRuns(page);

    // Find the run that contains the pasted "Document"
    // Paragraph 2 should contain "Office Document ToolkitDocument"
    const para2Runs = runs.filter((r) => r.paragraph === 1);
    const fullPara2Text = para2Runs.map((r) => r.text).join("");
    expect(fullPara2Text).toBe("Office Document ToolkitDocument");

    // All runs in paragraph 2 should have italic (STYLE_B), not bold (STYLE_A)
    for (const run of para2Runs) {
      expect(run.properties?.italic).toBe(true);
      expect(run.properties?.bold).toBeUndefined();
    }
  });

  test("copy 'Document' from paragraph 2, paste in paragraph 1 — preserves paragraph 2 style via styled paste", async ({ page }) => {
    await focusTextarea(page);

    // Select "Document" (positions 15 to 23)
    await setSelection(page, 15, 23);
    await page.waitForTimeout(100);

    // Copy
    await page.keyboard.press(`${MOD}+c`);
    await page.waitForTimeout(200);

    // Move cursor to end of paragraph 1 (position 7, after "Aurochs")
    await setSelection(page, 7, 7);
    await page.waitForTimeout(100);

    // Paste
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    const value = await getTextareaValue(page);
    expect(value).toBe("AurochsDocument\nOffice Document Toolkit");

    const runs = await getRuns(page);

    // Paragraph 1 should have "Aurochs" (bold) + "Document" (italic)
    const para1Runs = runs.filter((r) => r.paragraph === 0);
    expect(para1Runs.length).toBeGreaterThanOrEqual(2);

    const aurochsRun = para1Runs.find((r) => r.text === "Aurochs");
    const documentRun = para1Runs.find((r) => r.text === "Document");

    expect(aurochsRun).toBeDefined();
    expect(aurochsRun!.properties?.bold).toBe(true);

    expect(documentRun).toBeDefined();
    expect(documentRun!.properties?.italic).toBe(true);
    expect(documentRun!.properties?.bold).toBeUndefined();
  });

  test("typing then Cmd+Z undoes the typed character", async ({ page }) => {
    await focusTextarea(page);

    // Move cursor to end
    await page.keyboard.press(`${MOD}+ArrowDown`);
    await page.waitForTimeout(100);

    // Type a character
    await page.keyboard.type("X");
    await page.waitForTimeout(200);

    let value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document ToolkitX");

    // Undo
    await page.keyboard.press(`${MOD}+z`);
    await page.waitForTimeout(300);

    value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document Toolkit");
  });

  test("paste then Cmd+Z undoes the paste", async ({ page }) => {
    await focusTextarea(page);

    // Select "Document" (positions 15-23)
    await setSelection(page, 15, 23);
    await page.waitForTimeout(100);

    // Copy
    await page.keyboard.press(`${MOD}+c`);
    await page.waitForTimeout(200);

    // Move to end
    await page.keyboard.press(`${MOD}+ArrowDown`);
    await page.waitForTimeout(100);

    // Paste
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    let value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document ToolkitDocument");

    // Undo
    await page.keyboard.press(`${MOD}+z`);
    await page.waitForTimeout(300);

    value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document Toolkit");
  });

  test("cut 'Document' from paragraph 2 and paste back — preserves style", async ({ page }) => {
    await focusTextarea(page);

    // Select "Document" (positions 15 to 23)
    await setSelection(page, 15, 23);
    await page.waitForTimeout(100);

    // Cut
    await page.keyboard.press(`${MOD}+x`);
    await page.waitForTimeout(300);

    let value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice  Toolkit");

    // Paste back at current position
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document Toolkit");

    const runs = await getRuns(page);
    const para2Runs = runs.filter((r) => r.paragraph === 1);

    // All runs in paragraph 2 should retain italic style
    for (const run of para2Runs) {
      expect(run.properties?.italic).toBe(true);
      expect(run.properties?.bold).toBeUndefined();
    }
  });

  // ===========================================================================
  // Caret position preservation
  // ===========================================================================

  test("caret is positioned at end of pasted text, not reset to start", async ({ page }) => {
    await focusTextarea(page);

    // Select "Document" (positions 15-23)
    await setSelection(page, 15, 23);
    await page.waitForTimeout(100);

    // Copy
    await page.keyboard.press(`${MOD}+c`);
    await page.waitForTimeout(200);

    // Move to end of paragraph 2
    await page.keyboard.press(`${MOD}+ArrowDown`);
    await page.waitForTimeout(100);

    // Paste
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    // Caret should be right after the pasted "Document", not at position 0
    const sel = await getSelection(page);
    // "Aurochs\nOffice Document ToolkitDocument" = 39 chars
    // Caret should be at 39 (end)
    expect(sel.start).toBe(39);
    expect(sel.end).toBe(39);
  });

  test("can continue typing immediately after paste without caret reset", async ({ page }) => {
    await focusTextarea(page);

    // Select "Document" (positions 15-23)
    await setSelection(page, 15, 23);
    await page.waitForTimeout(100);

    // Copy
    await page.keyboard.press(`${MOD}+c`);
    await page.waitForTimeout(200);

    // Move to end
    await page.keyboard.press(`${MOD}+ArrowDown`);
    await page.waitForTimeout(100);

    // Paste
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    // Immediately type more characters without clicking or refocusing
    await page.keyboard.type("XY");
    await page.waitForTimeout(200);

    const value = await getTextareaValue(page);
    // "XY" should appear right after the pasted "Document", not at some other position
    expect(value).toBe("Aurochs\nOffice Document ToolkitDocumentXY");

    // The typed "XY" should inherit paragraph 2's style (italic)
    const runs = await getRuns(page);
    const para2Runs = runs.filter((r) => r.paragraph === 1);
    const fullText = para2Runs.map((r) => r.text).join("");
    expect(fullText).toBe("Office Document ToolkitDocumentXY");
    for (const run of para2Runs) {
      expect(run.properties?.italic).toBe(true);
    }
  });

  test("paste in middle of text, then type — caret stays at paste point", async ({ page }) => {
    await focusTextarea(page);

    // Select "Document" (positions 15-23)
    await setSelection(page, 15, 23);
    await page.waitForTimeout(100);

    // Copy
    await page.keyboard.press(`${MOD}+c`);
    await page.waitForTimeout(200);

    // Place caret at position 8 (start of paragraph 2, after "O" in "Office")
    await setSelection(page, 9, 9);
    await page.waitForTimeout(100);

    // Paste "Document" at position 9
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    // Caret should be at 9 + 8 ("Document".length) = 17
    const sel = await getSelection(page);
    expect(sel.start).toBe(17);
    expect(sel.end).toBe(17);

    // Type immediately
    await page.keyboard.type("!");
    await page.waitForTimeout(200);

    const value = await getTextareaValue(page);
    // "Aurochs\nODocument!ffice Document Toolkit"
    expect(value).toBe("Aurochs\nODocument!ffice Document Toolkit");
  });

  // ===========================================================================
  // IME composition compatibility
  // ===========================================================================

  test("IME composition at end of paragraph 2 does not lose characters", async ({ page }) => {
    await focusTextarea(page);

    // Move to end
    await page.keyboard.press(`${MOD}+ArrowDown`);
    await page.waitForTimeout(100);

    // Simulate IME composition (e.g., typing Japanese hiragana then confirming)
    // compositionstart → compositionupdate → compositionend
    await page.evaluate(() => {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
      if (!textarea) return;

      // Simulate compositionstart
      textarea.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
    });
    await page.waitForTimeout(50);

    // The textarea should still have focus and the original text
    const valueDuringComposition = await getTextareaValue(page);
    expect(valueDuringComposition).toBe("Aurochs\nOffice Document Toolkit");

    // Simulate compositionend with committed text
    // In a real IME flow, the browser inserts the committed text into the textarea.
    // We simulate this by directly typing the committed character.
    await page.evaluate(() => {
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
      if (!textarea) return;
      textarea.dispatchEvent(new CompositionEvent("compositionend", { data: "あ" }));
    });
    // Type the committed character (simulating what the browser does after compositionend)
    await page.keyboard.insertText("あ");
    await page.waitForTimeout(200);

    const value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document Toolkitあ");

    // The IME-committed character should not cause a caret reset
    const sel = await getSelection(page);
    expect(sel.start).toBe(32);
    expect(sel.end).toBe(32);
  });

  test("copy-paste followed by IME composition works correctly", async ({ page }) => {
    await focusTextarea(page);

    // Copy "Document" (positions 15-23)
    await setSelection(page, 15, 23);
    await page.waitForTimeout(100);
    await page.keyboard.press(`${MOD}+c`);
    await page.waitForTimeout(200);

    // Move to end and paste
    await page.keyboard.press(`${MOD}+ArrowDown`);
    await page.waitForTimeout(100);
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    let value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document ToolkitDocument");

    // Now do IME input right after paste
    await page.keyboard.insertText("テスト");
    await page.waitForTimeout(200);

    value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document ToolkitDocumentテスト");

    // Caret at end
    const sel = await getSelection(page);
    expect(sel.start).toBe(value.length);
    expect(sel.end).toBe(value.length);

    // Both pasted "Document" and IME "テスト" should have paragraph 2's style
    const runs = await getRuns(page);
    const para2Runs = runs.filter((r) => r.paragraph === 1);
    for (const run of para2Runs) {
      expect(run.properties?.italic).toBe(true);
    }
  });

  test("IME composition does not interfere with internal clipboard state", async ({ page }) => {
    await focusTextarea(page);

    // Copy "Aurochs" from paragraph 1 (positions 0-7)
    await setSelection(page, 0, 7);
    await page.waitForTimeout(100);
    await page.keyboard.press(`${MOD}+c`);
    await page.waitForTimeout(200);

    // Move to end of paragraph 2 and do IME input
    await page.keyboard.press(`${MOD}+ArrowDown`);
    await page.waitForTimeout(100);
    await page.keyboard.insertText("漢字");
    await page.waitForTimeout(200);

    let value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document Toolkit漢字");

    // Now paste — should still paste "Aurochs" with bold style from paragraph 1
    await page.keyboard.press(`${MOD}+v`);
    await page.waitForTimeout(300);

    value = await getTextareaValue(page);
    expect(value).toBe("Aurochs\nOffice Document Toolkit漢字Aurochs");

    const runs = await getRuns(page);
    // Last run should be "Aurochs" with bold (pasted from paragraph 1)
    const lastRun = runs[runs.length - 1];
    expect(lastRun.text).toBe("Aurochs");
    expect(lastRun.properties?.bold).toBe(true);
  });
});
