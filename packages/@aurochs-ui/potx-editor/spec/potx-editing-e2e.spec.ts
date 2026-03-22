/**
 * @file potx-editor editing operations E2E test
 *
 * Verifies all POTX_VISIBLE_TOOLS shape types can be:
 * selected, moved, resized, rotated, deleted, and added
 * via actual browser interaction (Puppeteer).
 *
 * Self-contained harness — no demo file dependency.
 *
 * Shape types tested: textbox, rect, roundRect, ellipse, triangle, rightArrow, connector
 */

// Test globals (describe, it, expect, beforeAll, afterAll) injected by the runner
import {
  startHarness,
  stopHarness,
  getShapeIds,
  getShapeBounds,
  getSelectedIds,
  getShapeCount,
  getTextEditState,
  addShape,
  clickShape,
  dragShape,
  getHitAreaScreenBox,
  type EditingHarness,
} from "./editing-harness/test-utils";

// Shape types matching POTX_VISIBLE_TOOLS (select excluded — it's a mode, not a shape)
const SHAPE_NAMES = [
  "textbox",
  "rect",
  "roundRect",
  "ellipse",
  "triangle",
  "rightArrow",
  "connector",
] as const;

// Shapes with area (connector is a zero-width line, so some operations differ)
const AREA_SHAPE_INDICES = [0, 1, 2, 3, 4, 5]; // All except connector

describe("potx-editor editing operations E2E", () => {
  const harnessRef = { value: undefined as EditingHarness | undefined };
  /** Get the harness instance, throwing if not yet initialized */
  function harness(): EditingHarness {
    if (!harnessRef.value) {throw new Error("Harness not initialized");}
    return harnessRef.value;
  }

  beforeAll(async () => {
    harnessRef.value = await startHarness();
  }, 60000);

  afterAll(async () => {
    if (harnessRef.value) {await stopHarness(harnessRef.value);}
  }, 15000);

  // =========================================================================
  // 1. All shape types are rendered
  // =========================================================================

  it("should render all 7 POTX_VISIBLE_TOOLS shape types", async () => {
    const ids = await getShapeIds(harness().page);
    expect(ids.length).toBe(SHAPE_NAMES.length);

    for (const id of ids) {
      const box = await getHitAreaScreenBox(harness().page, id);
      expect(box).not.toBeNull();
    }
  });

  // =========================================================================
  // 2. SELECT: each shape type can be selected
  // =========================================================================

  describe("SELECT", () => {
    for (const idx of AREA_SHAPE_INDICES) {
      it(`should select ${SHAPE_NAMES[idx]} on click`, async () => {
        await harness().page.mouse.click(5, 5);
        await new Promise((r) => setTimeout(r, 200));

        const ids = await getShapeIds(harness().page);
        await clickShape(harness().page, ids[idx]);

        const selected = await getSelectedIds(harness().page);
        expect(selected).toContain(ids[idx]);
      });
    }
  });

  // =========================================================================
  // 3. MOVE: each shape type can be moved
  // =========================================================================

  describe("MOVE", () => {
    for (const idx of AREA_SHAPE_INDICES) {
      it(`should move ${SHAPE_NAMES[idx]} via drag`, async () => {
        const ids = await getShapeIds(harness().page);
        const id = ids[idx];

        await clickShape(harness().page, id);
        const before = await getShapeBounds(harness().page, id);
        expect(before).not.toBeNull();

        await dragShape({ page: harness().page, id, dx: 60, dy: 40 });

        const after = await getShapeBounds(harness().page, id);
        expect(after).not.toBeNull();
        expect(after!.x).not.toBe(before!.x);
        expect(after!.y).not.toBe(before!.y);
      });
    }
  });

  // =========================================================================
  // 4. RESIZE: each shape type can be resized
  // =========================================================================

  describe("RESIZE", () => {
    for (const idx of AREA_SHAPE_INDICES) {
      it(`should resize ${SHAPE_NAMES[idx]} via SE corner drag`, async () => {
        const ids = await getShapeIds(harness().page);
        const id = ids[idx];

        await clickShape(harness().page, id);
        await new Promise((r) => setTimeout(r, 200));

        const before = await getShapeBounds(harness().page, id);
        expect(before).not.toBeNull();

        const hitBox = await getHitAreaScreenBox(harness().page, id);
        if (!hitBox) {return;}

        // SE corner
        const seX = hitBox.x + hitBox.width;
        const seY = hitBox.y + hitBox.height;

        await harness().page.mouse.move(seX, seY);
        await harness().page.mouse.down();
        const steps = 10;
        for (let step = 1; step <= steps; step++) {
          await harness().page.mouse.move(seX + (40 * step) / steps, seY + (30 * step) / steps);
          await new Promise((r) => setTimeout(r, 16));
        }
        await harness().page.mouse.up();
        await new Promise((r) => setTimeout(r, 300));

        const after = await getShapeBounds(harness().page, id);
        expect(after).not.toBeNull();

        const widthChanged = Math.abs(after!.width - before!.width) > 1;
        const heightChanged = Math.abs(after!.height - before!.height) > 1;
        expect(widthChanged || heightChanged).toBe(true);
      });
    }
  });

  // =========================================================================
  // 5. ROTATE: each shape type can be rotated
  // =========================================================================

  describe("ROTATE", () => {
    for (const idx of AREA_SHAPE_INDICES) {
      it(`should rotate ${SHAPE_NAMES[idx]} via rotate handle`, async () => {
        const ids = await getShapeIds(harness().page);
        const id = ids[idx];

        await clickShape(harness().page, id);
        await new Promise((r) => setTimeout(r, 200));

        const before = await getShapeBounds(harness().page, id);
        expect(before).not.toBeNull();

        const hitBox = await getHitAreaScreenBox(harness().page, id);
        if (!hitBox) {return;}

        // Rotate handle above the top-center
        const rotateX = hitBox.x + hitBox.width / 2;
        const rotateY = hitBox.y - 20;

        await harness().page.mouse.move(rotateX, rotateY);
        await harness().page.mouse.down();
        const steps = 10;
        for (let step = 1; step <= steps; step++) {
          const angle = (Math.PI / 4) * (step / steps);
          const r = 50;
          await harness().page.mouse.move(
            rotateX + r * Math.sin(angle),
            rotateY + r * (1 - Math.cos(angle)),
          );
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
        await harness().page.mouse.up();
        await new Promise((r) => setTimeout(r, 300));

        const after = await getShapeBounds(harness().page, id);
        expect(after).not.toBeNull();
        expect(after!.rotation).not.toBe(before!.rotation);
      });
    }
  });

  // =========================================================================
  // 6. DELETE: shapes can be deleted via keyboard
  // =========================================================================

  describe("DELETE", () => {
    it("should delete a shape via Backspace", async () => {
      const addedId = await addShape({ page: harness().page, type: "shape", preset: "rect" });
      await new Promise((r) => setTimeout(r, 300));
      expect(addedId).not.toBeNull();

      const countBefore = await getShapeCount(harness().page);

      await clickShape(harness().page, addedId!);
      await harness().page.keyboard.press("Backspace");
      await new Promise((r) => setTimeout(r, 300));

      const countAfter = await getShapeCount(harness().page);
      expect(countAfter).toBe(countBefore - 1);
    });

    it("should delete a shape via Delete key", async () => {
      const addedId = await addShape({ page: harness().page, type: "shape", preset: "ellipse" });
      await new Promise((r) => setTimeout(r, 300));

      const countBefore = await getShapeCount(harness().page);

      await clickShape(harness().page, addedId!);
      await harness().page.keyboard.press("Delete");
      await new Promise((r) => setTimeout(r, 300));

      const countAfter = await getShapeCount(harness().page);
      expect(countAfter).toBe(countBefore - 1);
    });
  });

  // =========================================================================
  // 7. ADD: all shape types can be created
  // =========================================================================

  describe("ADD", () => {
    const addableTypes = [
      { type: "textbox", preset: undefined },
      { type: "shape", preset: "rect" },
      { type: "shape", preset: "roundRect" },
      { type: "shape", preset: "ellipse" },
      { type: "shape", preset: "triangle" },
      { type: "shape", preset: "rightArrow" },
      { type: "connector", preset: undefined },
    ] as const;

    for (const { type, preset } of addableTypes) {
      const label = preset ? `${type}:${preset}` : type;

      it(`should add ${label} and render it in DOM`, async () => {
        const countBefore = await getShapeCount(harness().page);

        const addedId = await addShape({ page: harness().page, type, preset });
        await new Promise((r) => setTimeout(r, 300));

        expect(addedId).not.toBeNull();

        const countAfter = await getShapeCount(harness().page);
        expect(countAfter).toBe(countBefore + 1);

        const box = await getHitAreaScreenBox(harness().page, addedId!);
        expect(box).not.toBeNull();

        // Clean up
        await clickShape(harness().page, addedId!);
        await harness().page.keyboard.press("Delete");
        await new Promise((r) => setTimeout(r, 200));
      });
    }
  });

  // =========================================================================
  // 8. TEXT EDIT: double-click textbox enters text edit mode
  // =========================================================================

  describe("TEXT EDIT", () => {
    it("should enter text edit mode on double-click", async () => {
      const ids = await getShapeIds(harness().page);
      const textboxId = ids[0];

      const box = await getHitAreaScreenBox(harness().page, textboxId);
      expect(box).not.toBeNull();

      await harness().page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, { count: 2 });
      await new Promise((r) => setTimeout(r, 500));

      const state = await getTextEditState(harness().page);
      expect(state.active).toBe(true);
      expect(state.shapeId).toBe(textboxId);

      // Exit
      await harness().page.mouse.click(5, 5);
      await new Promise((r) => setTimeout(r, 300));

      const afterExit = await getTextEditState(harness().page);
      expect(afterExit.active).toBe(false);
    });
  });

  // =========================================================================
  // 9. UNDO/REDO: Cmd+Z undoes, Cmd+Shift+Z redoes
  // =========================================================================

  describe("UNDO / REDO", () => {
    it("should undo a move via Cmd+Z", async () => {
      const ids = await getShapeIds(harness().page);
      const id = ids[1]; // rect

      await clickShape(harness().page, id);
      const before = await getShapeBounds(harness().page, id);
      expect(before).not.toBeNull();

      await dragShape({ page: harness().page, id, dx: 70, dy: 50 });

      const afterMove = await getShapeBounds(harness().page, id);
      expect(afterMove).not.toBeNull();
      expect(afterMove!.x).not.toBe(before!.x);

      // Undo (Cmd+Z on Mac, Ctrl+Z otherwise)
      await harness().page.keyboard.down("Meta");
      await harness().page.keyboard.press("z");
      await harness().page.keyboard.up("Meta");
      await new Promise((r) => setTimeout(r, 300));

      const afterUndo = await getShapeBounds(harness().page, id);
      expect(afterUndo).not.toBeNull();
      expect(afterUndo!.x).toBeCloseTo(before!.x, 0);
      expect(afterUndo!.y).toBeCloseTo(before!.y, 0);
    });

    it("should redo via Cmd+Shift+Z", async () => {
      const ids = await getShapeIds(harness().page);
      const id = ids[2]; // roundRect

      await clickShape(harness().page, id);
      const before = await getShapeBounds(harness().page, id);
      expect(before).not.toBeNull();

      await dragShape({ page: harness().page, id, dx: 60, dy: 40 });
      const afterMove = await getShapeBounds(harness().page, id);

      // Undo
      await harness().page.keyboard.down("Meta");
      await harness().page.keyboard.press("z");
      await harness().page.keyboard.up("Meta");
      await new Promise((r) => setTimeout(r, 300));

      const afterUndo = await getShapeBounds(harness().page, id);
      expect(afterUndo!.x).toBeCloseTo(before!.x, 0);

      // Redo (Cmd+Shift+Z)
      await harness().page.keyboard.down("Meta");
      await harness().page.keyboard.down("Shift");
      await harness().page.keyboard.press("z");
      await harness().page.keyboard.up("Shift");
      await harness().page.keyboard.up("Meta");
      await new Promise((r) => setTimeout(r, 300));

      const afterRedo = await getShapeBounds(harness().page, id);
      expect(afterRedo).not.toBeNull();
      expect(afterRedo!.x).toBeCloseTo(afterMove!.x, 0);
      expect(afterRedo!.y).toBeCloseTo(afterMove!.y, 0);
    });

    it("should undo delete and restore the shape", async () => {
      const addedId = await addShape({ page: harness().page, type: "shape", preset: "triangle" });
      await new Promise((r) => setTimeout(r, 300));
      expect(addedId).not.toBeNull();

      await clickShape(harness().page, addedId!);
      await harness().page.keyboard.press("Delete");
      await new Promise((r) => setTimeout(r, 300));

      // Shape should be gone
      const boundsAfterDelete = await getShapeBounds(harness().page, addedId!);
      expect(boundsAfterDelete).toBeNull();

      // Undo
      await harness().page.keyboard.down("Meta");
      await harness().page.keyboard.press("z");
      await harness().page.keyboard.up("Meta");
      await new Promise((r) => setTimeout(r, 300));

      // Shape should be back
      const boundsAfterUndo = await getShapeBounds(harness().page, addedId!);
      expect(boundsAfterUndo).not.toBeNull();

      // Clean up
      await clickShape(harness().page, addedId!);
      await harness().page.keyboard.press("Delete");
      await new Promise((r) => setTimeout(r, 200));
    });
  });

  // =========================================================================
  // 10. DESELECT: background click clears selection
  // =========================================================================

  it("should deselect on background click", async () => {
    const ids = await getShapeIds(harness().page);
    await clickShape(harness().page, ids[0]);

    const selected = await getSelectedIds(harness().page);
    expect(selected.length).toBeGreaterThan(0);

    await harness().page.mouse.click(5, 5);
    await new Promise((r) => setTimeout(r, 200));

    const deselected = await getSelectedIds(harness().page);
    expect(deselected.length).toBe(0);
  });
});
