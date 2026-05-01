/**
 * @file Figma autolayout primary-axis position recalculation.
 *
 * Counter-axis stretch (one child's cross-axis dimension expanding to
 * fill the parent) lives in `builder.ts:applyCounterAxisStretch`. This
 * module is the SoT for the *primary-axis* layout — distributing
 * children along the stack direction with the parent's
 * `stackPrimaryAlignItems` (MIN / CENTER / MAX / SPACE_BETWEEN /
 * SPACE_EVENLY) and respecting per-side stackPadding.
 *
 * Why we need it:
 *
 *   Figma's `derivedSymbolData` records the post-resize / post-CPA
 *   *positions* of each descendant inside an INSTANCE. When DSD entries
 *   pin a child's transform we honour them verbatim (they're a SoT for
 *   that INSTANCE's resolved layout). But when a FRAME is plain
 *   autolayout — no DSD because it's not the root of an INSTANCE
 *   subtree, just a layout container — we have to *compute* the
 *   children's positions ourselves.
 *
 *   The counter-axis stretch alone is not enough: Toolbar - Top's
 *   "Controls" FRAME is HORIZONTAL with stackPrimaryAlignItems=
 *   SPACE_EVENLY and three children (Leading, Spacer, Trailing). The
 *   children's stored x positions are SYMBOL-default values; without
 *   primary-axis computation Leading sits at its declared x while
 *   Trailing sits at *its* declared x, leaving Spacer in the middle —
 *   which by coincidence sometimes matches Figma's actual layout but
 *   generally drifts.
 *
 * Scope:
 *
 *   - layoutMode VERTICAL or HORIZONTAL (NONE → noop)
 *   - stackPrimaryAlignItems: MIN, CENTER, MAX, SPACE_BETWEEN,
 *     SPACE_EVENLY, SPACE_AROUND (the values the schema allows for
 *     `StackJustify`)
 *   - stackChildPrimaryGrow: per-child grow factor (FILL behaviour)
 *
 * Out of scope:
 *
 *   - stackWrap (multi-line autolayout) — not seen in edge-cases.fig
 *   - absolutely-positioned (stackPositioning=ABSOLUTE) children — they
 *     keep their authored transform
 */

export type PrimaryAxisParent = {
  readonly size?: { readonly x: number; readonly y: number };
  readonly autoLayout?: {
    readonly stackMode?: { readonly name?: string };
    readonly stackPadding?: number | { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
    readonly stackSpacing?: number;
    readonly stackPrimaryAlignItems?: { readonly name?: string };
  };
};

export type PrimaryAxisChild = {
  readonly size?: { readonly x: number; readonly y: number };
  readonly transform?: {
    readonly m00: number; readonly m01: number; readonly m02: number;
    readonly m10: number; readonly m11: number; readonly m12: number;
  };
  readonly visible?: boolean;
  readonly layoutConstraints?: {
    readonly stackPositioning?: { readonly name?: string };
    readonly stackChildPrimaryGrow?: number;
  };
};

function readPadding(sp: number | { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number } | undefined): { top: number; right: number; bottom: number; left: number } {
  if (typeof sp === "number") {
    return { top: sp, right: sp, bottom: sp, left: sp };
  }
  if (sp && typeof sp === "object") {
    return { top: sp.top, right: sp.right, bottom: sp.bottom, left: sp.left };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/**
 * Distribute the children's positions along the parent's primary axis.
 *
 * Returns a new children array with each (visible, non-absolute) child
 * having its transform translated to the computed primary-axis offset.
 * Counter-axis position is preserved from the input child.
 *
 * `applyCounterAxisStretch` is expected to have already run, so each
 * child's `size` is already correct on the counter axis when relevant.
 */
export function applyAutoLayoutPrimaryAxis<C extends PrimaryAxisChild>(parent: PrimaryAxisParent, children: readonly C[]): readonly C[] {
  const autoLayout = parent.autoLayout;
  if (!autoLayout) return children;
  const modeName = autoLayout.stackMode?.name;
  if (modeName !== "VERTICAL" && modeName !== "HORIZONTAL") return children;
  const pSize = parent.size;
  if (!pSize) return children;

  const horizontal = modeName === "HORIZONTAL";
  const padding = readPadding(autoLayout.stackPadding);
  const padPrimaryStart = horizontal ? padding.left : padding.top;
  const padPrimaryEnd = horizontal ? padding.right : padding.bottom;
  const primaryParent = horizontal ? pSize.x : pSize.y;
  const contentSpan = primaryParent - padPrimaryStart - padPrimaryEnd;
  if (contentSpan <= 0) return children;

  // Filter to layout-participating children (visible + non-absolute).
  type Idx = { idx: number; child: C; primarySize: number };
  const flow: Idx[] = [];
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.visible === false) continue;
    const pos = c.layoutConstraints?.stackPositioning?.name;
    if (pos === "ABSOLUTE") continue;
    if (!c.size) continue;
    flow.push({ idx: i, child: c, primarySize: horizontal ? c.size.x : c.size.y });
  }
  if (flow.length === 0) return children;

  // Apply FILL grow first: any child with stackChildPrimaryGrow=1 takes
  // the leftover space after fixed children + spacing. We split the
  // leftover evenly among grow children.
  const spacing = autoLayout.stackSpacing ?? 0;
  const align = autoLayout.stackPrimaryAlignItems?.name;
  const isJustifySpace = align === "SPACE_BETWEEN" || align === "SPACE_EVENLY" || align === "SPACE_AROUND";

  const fixedSizeSum = flow.reduce((s, e) => s + e.primarySize, 0);
  const growChildren = flow.filter((e) => (e.child.layoutConstraints?.stackChildPrimaryGrow ?? 0) > 0);
  if (growChildren.length > 0 && !isJustifySpace) {
    // Available space minus base sizes minus inter-item spacing.
    const totalSpacing = spacing * (flow.length - 1);
    const free = contentSpan - fixedSizeSum - totalSpacing;
    if (free > 0) {
      const perGrow = free / growChildren.length;
      for (const g of growChildren) {
        g.primarySize = g.primarySize + perGrow;
      }
    }
  }

  // Compute starting offset and inter-item gap based on alignment.
  const flowSizeSum = flow.reduce((s, e) => s + e.primarySize, 0);
  let startOffset = padPrimaryStart;
  let gap = spacing;
  switch (align) {
    case "CENTER": {
      const usedSpacing = spacing * (flow.length - 1);
      const blockSize = flowSizeSum + usedSpacing;
      startOffset = padPrimaryStart + (contentSpan - blockSize) / 2;
      break;
    }
    case "MAX": {
      const usedSpacing = spacing * (flow.length - 1);
      const blockSize = flowSizeSum + usedSpacing;
      startOffset = padPrimaryStart + (contentSpan - blockSize);
      break;
    }
    case "SPACE_BETWEEN": {
      // First flush to the start, last flush to the end. Spacing is
      // distributed across the (n-1) gaps. Single child collapses to MIN.
      if (flow.length > 1) {
        const free = contentSpan - flowSizeSum;
        gap = free / (flow.length - 1);
      }
      startOffset = padPrimaryStart;
      break;
    }
    case "SPACE_EVENLY": {
      // Equal gap before, between and after — (n+1) equal gaps.
      const free = contentSpan - flowSizeSum;
      gap = free / (flow.length + 1);
      startOffset = padPrimaryStart + gap;
      break;
    }
    case "SPACE_AROUND": {
      // Half gap before/after, full gaps between — (n) gaps total but
      // the outer two are halved.
      const free = contentSpan - flowSizeSum;
      gap = free / flow.length;
      startOffset = padPrimaryStart + gap / 2;
      break;
    }
    case "MIN":
    case undefined:
    default: {
      startOffset = padPrimaryStart;
      gap = spacing;
      break;
    }
  }

  // Walk flow children, assign primary positions, build new array.
  const result: C[] = children.slice();
  let cursor = startOffset;
  for (const f of flow) {
    const original = f.child;
    const oldT = original.transform ?? { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
    const newM02 = horizontal ? cursor : oldT.m02;
    const newM12 = horizontal ? oldT.m12 : cursor;
    const newSizeAxis = f.primarySize;
    const newSize = original.size && (
      (horizontal && Math.abs(original.size.x - newSizeAxis) > 0.5) ||
      (!horizontal && Math.abs(original.size.y - newSizeAxis) > 0.5)
    )
      ? (horizontal
          ? { x: newSizeAxis, y: original.size.y }
          : { x: original.size.x, y: newSizeAxis })
      : original.size;
    const updated = {
      ...original,
      transform: { ...oldT, m02: newM02, m12: newM12 },
      size: newSize,
    } as C;
    result[f.idx] = updated;
    cursor += f.primarySize + gap;
  }
  return result;
}
