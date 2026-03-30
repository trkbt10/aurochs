import { test, expect } from "@playwright/test";

const SHEET_TEXT = "Drag your favourite items into the toolbar...";

test.describe("Ribbon Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/ribbon");
    await page.getByRole("toolbar", { name: "Ribbon" }).waitFor();
  });

  test("renders without layout collapse", async ({ page }) => {
    const ribbon = page.getByRole("toolbar", { name: "Ribbon" });
    const box = await ribbon.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(30);
    expect(box!.width).toBeGreaterThan(100);
  });

  test("no layout shift when switching tabs", async ({ page }) => {
    const ribbon = page.getByRole("toolbar", { name: "Ribbon" });
    const boxHome = await ribbon.boundingBox();

    await page.getByRole("tab", { name: "Insert" }).click();
    const boxInsert = await ribbon.boundingBox();

    expect(boxInsert!.height).toBe(boxHome!.height);
  });

  test("tab switching changes content", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Home" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTitle("Bold")).toBeVisible();

    await page.getByRole("tab", { name: "Insert" }).click();

    await expect(page.getByTitle("Bold")).not.toBeVisible();
    await expect(page.getByTitle("Text Box")).toBeVisible();
  });

  test("buttons are clickable and produce actions", async ({ page }) => {
    await page.getByTitle("Bold").click();
    await expect(page.getByText("bold")).toBeVisible();
  });

  test("visual regression - full page with home tab", async ({ page }) => {
    await expect(page).toHaveScreenshot("ribbon-full-home.png");
  });

  test("visual regression - full page with insert tab", async ({ page }) => {
    await page.getByRole("tab", { name: "Insert" }).click();
    await expect(page).toHaveScreenshot("ribbon-full-insert.png");
  });
});

test.describe("Customize Sheet", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/ribbon");
    await page.getByRole("toolbar", { name: "Ribbon" }).waitFor();
  });

  test("sheet opens on customize button click", async ({ page }) => {
    await expect(page.getByText(SHEET_TEXT)).not.toBeVisible();

    await page.getByTitle("Customize toolbar").click();

    await expect(page.getByText(SHEET_TEXT)).toBeVisible();
  });

  test("ribbon is unchanged when sheet is open", async ({ page }) => {
    const ribbon = page.getByRole("toolbar", { name: "Ribbon" });
    const boxBefore = await ribbon.boundingBox();

    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    const boxAfter = await ribbon.boundingBox();
    expect(boxAfter!.height).toBe(boxBefore!.height);
    expect(boxAfter!.y).toBe(boxBefore!.y);

    await expect(ribbon.getByTitle("Bold")).toBeVisible();
  });

  test("sheet shows palette items with labels", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    await expect(page.getByText("Strikethrough")).toBeVisible();
    await expect(page.getByText("Bullet List")).toBeVisible();
  });

  test("sheet shows default set", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    await expect(page.getByText("...or drag the default set into the toolbar.")).toBeVisible();
  });

  test("Done closes the sheet", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await expect(page.getByText(SHEET_TEXT)).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();

    await expect(page.getByText(SHEET_TEXT)).not.toBeVisible();
  });

  test("visual regression - sheet open", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();
    await expect(page).toHaveScreenshot("customize-sheet-open.png");
  });

  test("DnD: dragging palette item to group adds it", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    const fontGroup = page.getByRole("group", { name: "Font" });
    const childrenBefore = await fontGroup.locator("> div:first-child > *").count();

    // Drag Strikethrough label from palette to Font group
    const palStrike = page.getByText("Strikethrough").first();
    await palStrike.dragTo(fontGroup);

    const childrenAfter = await fontGroup.locator("> div:first-child > *").count();
    expect(childrenAfter).toBe(childrenBefore + 1);
  });

  test("visual regression - after DnD add", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    const palStrike = page.getByText("Strikethrough").first();
    const fontGroup = page.getByRole("group", { name: "Font" });
    await palStrike.dragTo(fontGroup);

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveScreenshot("ribbon-after-dnd-add.png");
  });

  test("customize mode shows add tab and add group buttons on ribbon", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    await expect(page.getByTitle("Add tab")).toBeVisible();
    await expect(page.getByTitle("Add group")).toBeVisible();
  });

  test("customize mode shows tab and group controls on ribbon itself", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    await expect(page.getByTitle("Add group")).toBeVisible();
    await expect(page.getByTitle("Add tab")).toBeVisible();
  });

  test("visual regression - sheet with tab and group management", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();
    await expect(page).toHaveScreenshot("customize-sheet-full.png");
  });

  test("font group contains non-button items (font-family, font-size, color picker)", async ({ page }) => {
    const fontGroup = page.getByRole("group", { name: "Font" });
    await expect(fontGroup.locator("input").first()).toBeVisible();
    const children = await fontGroup.locator("> div:first-child > *").count();
    expect(children).toBeGreaterThanOrEqual(5);
  });

  test("visual regression - ribbon with non-button items", async ({ page }) => {
    await expect(page).toHaveScreenshot("ribbon-with-inputs.png");
  });

  test("tab DnD: dragging first tab to second position reorders tabs", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    const tabs = page.getByRole("tab");
    const firstTextBefore = await tabs.nth(0).textContent();

    await tabs.nth(0).dragTo(tabs.nth(1));

    const firstTextAfter = await tabs.nth(0).textContent();
    expect(firstTextAfter).not.toBe(firstTextBefore);
  });

  test("group DnD: dragging first group to second position reorders groups", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    const firstGroup = page.getByRole("group", { name: "Font" });
    const secondGroup = page.getByRole("group", { name: "Paragraph" });

    await firstGroup.getByText("Font").dragTo(secondGroup.getByText("Paragraph"));

    const groups = page.getByRole("group");
    const firstLabel = await groups.nth(0).getAttribute("aria-label");
    expect(firstLabel).toBe("Paragraph");
  });

  test("groups show drop hint outline when dragging a palette item", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    const groups = page.getByRole("group");
    const count = await groups.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("dropping a palette item on + button creates a new group with that item", async ({ page }) => {
    await page.getByTitle("Customize toolbar").click();
    await page.getByText(SHEET_TEXT).waitFor();

    const groupsBefore = await page.getByRole("group").count();

    const palStrike = page.getByText("Strikethrough").first();
    const addGroupBtn = page.getByTitle("Add group");
    await palStrike.dragTo(addGroupBtn);

    const groupsAfter = await page.getByRole("group").count();
    expect(groupsAfter).toBe(groupsBefore + 1);

    const newGroup = page.getByRole("group").nth(groupsAfter - 1);
    await expect(newGroup).toContainText("Strikethrough");
  });
});
