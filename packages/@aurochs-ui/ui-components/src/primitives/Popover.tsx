/**
 * @file Popover primitive component
 *
 * A minimal popover that appears relative to a trigger element.
 * Uses a portal to render outside the DOM hierarchy.
 */

import {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { colorTokens, radiusTokens, spacingTokens } from "../design-tokens";
import {
  calculatePopoverPosition,
  type PopoverAlign,
  type PopoverSide,
} from "./popover-position";

export type PopoverProps = {
  /** Trigger element that opens the popover */
  readonly trigger: ReactNode;
  /** Content to display in the popover */
  readonly children: ReactNode;
  /** Whether the popover is open (controlled mode) */
  readonly open?: boolean;
  /** Callback when open state changes */
  readonly onOpenChange?: (open: boolean) => void;
  /** Preferred alignment of the popover */
  readonly align?: PopoverAlign;
  /** Preferred side of the popover */
  readonly side?: PopoverSide;
  /** Show an arrow pointing to the trigger */
  readonly showArrow?: boolean;
  /** Disable the popover */
  readonly disabled?: boolean;
  /** Additional CSS class */
  readonly className?: string;
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 999,
};

const contentStyle: CSSProperties = {
  position: "fixed",
  zIndex: 1000,
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRadius: `var(--radius-md, ${radiusTokens.md})`,
  border: `1px solid var(--border-primary, ${colorTokens.border.primary})`,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  padding: spacingTokens.md,
  maxWidth: "400px",
  maxHeight: "80vh",
  overflow: "auto",
};

const arrowBorderSize = 8;
const arrowFillSize = 7;

type ArrowStyles = {
  readonly border: CSSProperties;
  readonly fill: CSSProperties;
};

type ArrowConfig = {
  readonly offsetProp: "top" | "left";
  readonly positionProp: "left" | "right" | "top" | "bottom";
  readonly edgeProp: "borderLeft" | "borderRight" | "borderTop" | "borderBottom";
  readonly crossProps: readonly ["borderTop" | "borderBottom" | "borderLeft" | "borderRight", "borderTop" | "borderBottom" | "borderLeft" | "borderRight"];
  readonly transform: "translateX(-50%)" | "translateY(-50%)";
};

const arrowConfigs: Record<PopoverSide, ArrowConfig> = {
  right: {
    offsetProp: "top",
    positionProp: "left",
    edgeProp: "borderRight",
    crossProps: ["borderTop", "borderBottom"],
    transform: "translateY(-50%)",
  },
  left: {
    offsetProp: "top",
    positionProp: "right",
    edgeProp: "borderLeft",
    crossProps: ["borderTop", "borderBottom"],
    transform: "translateY(-50%)",
  },
  top: {
    offsetProp: "left",
    positionProp: "bottom",
    edgeProp: "borderBottom",
    crossProps: ["borderLeft", "borderRight"],
    transform: "translateX(-50%)",
  },
  bottom: {
    offsetProp: "left",
    positionProp: "top",
    edgeProp: "borderTop",
    crossProps: ["borderLeft", "borderRight"],
    transform: "translateX(-50%)",
  },
};

type BuildArrowStyleInput = {
  readonly side: PopoverSide;
  readonly offset: number;
  readonly size: number;
  readonly color: string;
};

function buildArrowStyle({ side, offset, size, color }: BuildArrowStyleInput): CSSProperties {
  const config = arrowConfigs[side];
  const style: Record<string, string | number> = {
    position: "absolute",
    width: 0,
    height: 0,
    pointerEvents: "none",
    transform: config.transform,
  };
  style[config.offsetProp] = offset;
  style[config.positionProp] = -size;
  style[config.edgeProp] = `${size}px solid ${color}`;
  style[config.crossProps[0]] = `${size}px solid transparent`;
  style[config.crossProps[1]] = `${size}px solid transparent`;
  return style as CSSProperties;
}

function getArrowStyles(side: PopoverSide, offset: number): ArrowStyles {
  return {
    border: buildArrowStyle({
      side,
      offset,
      size: arrowBorderSize,
      color: `var(--border-primary, ${colorTokens.border.primary})`,
    }),
    fill: buildArrowStyle({
      side,
      offset,
      size: arrowFillSize,
      color: `var(--bg-secondary, ${colorTokens.background.secondary})`,
    }),
  };
}

function buildArrowStyles(
  showArrow: boolean,
  side: PopoverSide,
  offset: number
): ArrowStyles | null {
  if (!showArrow) {
    return null;
  }
  return getArrowStyles(side, offset);
}

type Position = {
  readonly top: number;
  readonly left: number;
  readonly side: PopoverSide;
  readonly arrowOffset: number;
};

/**
 * A popover component that displays content relative to a trigger element.
 */
export function Popover({
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  align = "center",
  side = "bottom",
  showArrow = false,
  disabled,
  className,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const positionUpdateIdRef = useRef(0);
  const resolvedPosition = position ?? {
    top: 0,
    left: 0,
    side,
    arrowOffset: 0,
  };
  const arrowStyles = buildArrowStyles(
    showArrow && position !== null,
    resolvedPosition.side,
    resolvedPosition.arrowOffset
  );

  const handleOpen = useCallback(() => {
    if (disabled) {
      return;
    }
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      setInternalOpen(true);
      onOpenChange?.(true);
    }
  }, [disabled, isControlled, onOpenChange]);

  const handleClose = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalOpen(false);
      onOpenChange?.(false);
    }
  }, [isControlled, onOpenChange]);

  const handleContentPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.stopPropagation();
    },
    []
  );

  const handleContentClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
    },
    []
  );

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    if (!triggerRef.current || !contentRef.current) {
      return;
    }

    positionUpdateIdRef.current += 1;
    const updateId = positionUpdateIdRef.current;

    const updatePosition = () => {
      if (!triggerRef.current || !contentRef.current) {
        return;
      }
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      if (positionUpdateIdRef.current === updateId) {
        setPosition(
          calculatePopoverPosition({
            triggerRect,
            contentSize: { width: contentRect.width, height: contentRect.height },
            viewport: { width: window.innerWidth, height: window.innerHeight },
            preferredSide: side,
            align,
            gap: 8,
            padding: 8,
            arrowInset: 8,
          })
        );
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      positionUpdateIdRef.current += 1;
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, side, align]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{ cursor: disabled ? "not-allowed" : "pointer", display: "inline-block" }}
        className={className}
      >
        {trigger}
      </div>

      {open &&
        createPortal(
          <>
            <div style={overlayStyle} onClick={handleClose} />
            <div
              ref={contentRef}
              style={{
                ...contentStyle,
                top: resolvedPosition.top,
                left: resolvedPosition.left,
                visibility: position ? "visible" : "hidden",
              }}
              onPointerDown={handleContentPointerDown}
              onClick={handleContentClick}
              data-side={resolvedPosition.side}
            >
              {arrowStyles && (
                <>
                  <div style={arrowStyles.border} />
                  <div style={arrowStyles.fill} />
                </>
              )}
              {children}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
