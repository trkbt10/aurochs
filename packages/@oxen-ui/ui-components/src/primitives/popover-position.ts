/**
 * @file Popover positioning helpers
 *
 * Centralized placement logic with flip and viewport clamping.
 */

export type PopoverSide = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

export type PopoverViewport = {
  readonly width: number;
  readonly height: number;
};

export type PopoverSize = {
  readonly width: number;
  readonly height: number;
};

export type PopoverPositionInput = {
  readonly triggerRect: DOMRect;
  readonly contentSize: PopoverSize;
  readonly viewport: PopoverViewport;
  readonly preferredSide: PopoverSide;
  readonly align: PopoverAlign;
  readonly gap: number;
  readonly padding: number;
  readonly arrowInset: number;
};

export type PopoverPositionResult = {
  readonly top: number;
  readonly left: number;
  readonly side: PopoverSide;
  readonly arrowOffset: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getOppositeSide(side: PopoverSide): PopoverSide {
  switch (side) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "top":
      return "bottom";
    default:
      return "top";
  }
}

function getAvailableSpaces(
  triggerRect: DOMRect,
  viewport: PopoverViewport,
  padding: number
): Record<PopoverSide, number> {
  return {
    top: triggerRect.top - padding,
    bottom: viewport.height - triggerRect.bottom - padding,
    left: triggerRect.left - padding,
    right: viewport.width - triggerRect.right - padding,
  };
}

function canFit(
  side: PopoverSide,
  contentSize: PopoverSize,
  spaces: Record<PopoverSide, number>,
  gap: number
): boolean {
  if (side === "top" || side === "bottom") {
    return spaces[side] >= contentSize.height + gap;
  }
  return spaces[side] >= contentSize.width + gap;
}

function resolveSide(input: PopoverPositionInput): PopoverSide {
  const { preferredSide, contentSize, gap, triggerRect, viewport, padding } = input;
  const spaces = getAvailableSpaces(triggerRect, viewport, padding);
  const oppositeSide = getOppositeSide(preferredSide);

  if (canFit(preferredSide, contentSize, spaces, gap)) {
    return preferredSide;
  }
  if (canFit(oppositeSide, contentSize, spaces, gap)) {
    return oppositeSide;
  }

  const orderedSides: readonly PopoverSide[] = [
    preferredSide,
    oppositeSide,
    "right",
    "left",
    "bottom",
    "top",
  ];

  const maxSpace = Math.max(...Object.values(spaces));
  const maxSides = orderedSides.filter((side) => spaces[side] === maxSpace);
  return maxSides[0] ?? preferredSide;
}

function getAlignedLeft(
  triggerRect: DOMRect,
  contentSize: PopoverSize,
  align: PopoverAlign
): number {
  if (align === "center") {
    return triggerRect.left + (triggerRect.width - contentSize.width) / 2;
  }
  if (align === "end") {
    return triggerRect.right - contentSize.width;
  }
  return triggerRect.left;
}

function getAlignedTop(
  triggerRect: DOMRect,
  contentSize: PopoverSize,
  align: PopoverAlign
): number {
  if (align === "center") {
    return triggerRect.top + (triggerRect.height - contentSize.height) / 2;
  }
  if (align === "end") {
    return triggerRect.bottom - contentSize.height;
  }
  return triggerRect.top;
}

function getAlignedPosition(
  triggerRect: DOMRect,
  contentSize: PopoverSize,
  side: PopoverSide,
  align: PopoverAlign,
  gap: number
): { top: number; left: number } {
  if (side === "top" || side === "bottom") {
    const left = getAlignedLeft(triggerRect, contentSize, align);
    if (side === "bottom") {
      return { top: triggerRect.bottom + gap, left };
    }
    return { top: triggerRect.top - contentSize.height - gap, left };
  }

  const top = getAlignedTop(triggerRect, contentSize, align);
  if (side === "right") {
    return { top, left: triggerRect.right + gap };
  }
  return { top, left: triggerRect.left - contentSize.width - gap };
}

function getArrowOffset(
  side: PopoverSide,
  triggerRect: DOMRect,
  contentPosition: { top: number; left: number },
  contentSize: PopoverSize,
  arrowInset: number
): number {
  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;
  if (side === "top" || side === "bottom") {
    return clamp(
      triggerCenterX - contentPosition.left,
      arrowInset,
      contentSize.width - arrowInset
    );
  }
  return clamp(
    triggerCenterY - contentPosition.top,
    arrowInset,
    contentSize.height - arrowInset
  );
}

/**
 * Calculate popover placement with flip and clamping.
 */
export function calculatePopoverPosition(
  input: PopoverPositionInput
): PopoverPositionResult {
  const { triggerRect, contentSize, viewport, align, gap, padding, arrowInset } = input;
  const side = resolveSide(input);
  const aligned = getAlignedPosition(triggerRect, contentSize, side, align, gap);

  const left = clamp(
    aligned.left,
    padding,
    Math.max(padding, viewport.width - contentSize.width - padding)
  );
  const top = clamp(
    aligned.top,
    padding,
    Math.max(padding, viewport.height - contentSize.height - padding)
  );

  const arrowOffset = getArrowOffset(
    side,
    triggerRect,
    { top, left },
    contentSize,
    arrowInset
  );

  return { top, left, side, arrowOffset };
}
