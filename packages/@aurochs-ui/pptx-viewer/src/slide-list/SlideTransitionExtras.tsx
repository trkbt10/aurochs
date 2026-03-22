/**
 * @file Slide transition extras component
 *
 * PPTX-specific extras rendered inside item thumbnails via the
 * generic ItemList's renderItemExtras prop. Shows Fx button with
 * transition editor popover.
 */

import { useState } from "react";
import type { SlideWithId, SlideId } from "@aurochs-office/pptx/app";
import type { SlideTransition } from "@aurochs-office/pptx/domain/transition";
import { TransitionEditor } from "@aurochs-ui/ooxml-components";
import { FxIcon } from "@aurochs-ui/ui-components/icons";
import { Popover } from "@aurochs-ui/ui-components/primitives";
import { spacingTokens, colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import type { CSSProperties } from "react";

function getFxButtonStyle(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    bottom: spacingTokens.xs,
    right: spacingTokens.xs,
    width: "22px",
    height: "22px",
    padding: 0,
    borderRadius: "999px",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    color: colorTokens.overlay.lightText,
    border: "1px solid rgba(255, 255, 255, 0.12)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 0.12s ease, background-color 0.12s ease",
    zIndex: 10,
  };
}

const popoverContainerStyle: CSSProperties = {
  minWidth: "260px",
};

const popoverTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  marginBottom: "8px",
  color: "var(--text-primary, #e5e5e5)",
};

export type SlideTransitionExtrasProps = {
  readonly slideWithId: SlideWithId;
  readonly isHovered: boolean;
  readonly isAnyDragging: boolean;
  readonly onTransitionChange: (slideId: SlideId, transition: SlideTransition | undefined) => void;
};

/**
 * Fx button + transition editor popover for slide items.
 * Rendered via ItemList's renderItemExtras prop.
 */
export function SlideTransitionExtras({
  slideWithId,
  isHovered,
  isAnyDragging,
  onTransitionChange,
}: SlideTransitionExtrasProps) {
  const [isFxOpen, setIsFxOpen] = useState(false);

  const hasTransition = slideWithId.slide.transition !== undefined && slideWithId.slide.transition.type !== "none";
  const showFxButton = !isAnyDragging && (hasTransition || isHovered);

  if (!showFxButton) {
    return null;
  }

  const handleFxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFxOpen((prev) => !prev);
  };

  return (
    <Popover
      open={isFxOpen}
      onOpenChange={setIsFxOpen}
      align="center"
      side="right"
      showArrow
      trigger={
        <button
          type="button"
          style={getFxButtonStyle(showFxButton)}
          onClick={handleFxClick}
          aria-label="Scene effects"
        >
          <FxIcon size={12} strokeWidth={2} />
        </button>
      }
    >
      <div style={popoverContainerStyle}>
        <div style={popoverTitleStyle}>
          Scene Effects
        </div>
        <TransitionEditor
          value={slideWithId.slide.transition}
          onChange={(transition) => onTransitionChange(slideWithId.id, transition)}
        />
      </div>
    </Popover>
  );
}
