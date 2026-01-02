/**
 * @file Popover primitive component
 *
 * A minimal popover that appears relative to a trigger element.
 * Uses a portal to render outside the DOM hierarchy.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

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
  readonly align?: "start" | "center" | "end";
  /** Preferred side of the popover */
  readonly side?: "top" | "bottom" | "left" | "right";
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
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  padding: "12px",
  maxWidth: "400px",
  maxHeight: "80vh",
  overflow: "auto",
};

type Position = {
  readonly top: number;
  readonly left: number;
};

function calculatePosition(
  triggerRect: DOMRect,
  contentRect: DOMRect,
  side: "top" | "bottom" | "left" | "right",
  align: "start" | "center" | "end"
): Position {
  const gap = 8;
  const padding = 8;

  const result = { top: 0, left: 0 };

  if (side === "bottom") {
    result.top = triggerRect.bottom + gap;
  } else if (side === "top") {
    result.top = triggerRect.top - contentRect.height - gap;
  } else if (side === "left") {
    result.left = triggerRect.left - contentRect.width - gap;
  } else {
    result.left = triggerRect.right + gap;
  }

  if (side === "top" || side === "bottom") {
    if (align === "start") {
      result.left = triggerRect.left;
    } else if (align === "center") {
      result.left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
    } else {
      result.left = triggerRect.right - contentRect.width;
    }
  } else {
    if (align === "start") {
      result.top = triggerRect.top;
    } else if (align === "center") {
      result.top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
    } else {
      result.top = triggerRect.bottom - contentRect.height;
    }
  }

  result.left = Math.max(padding, Math.min(result.left, window.innerWidth - contentRect.width - padding));
  result.top = Math.max(padding, Math.min(result.top, window.innerHeight - contentRect.height - padding));

  return result;
}

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
  disabled,
  className,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });

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

  useEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current || !contentRef.current) {
        return;
      }
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      setPosition(calculatePosition(triggerRect, contentRect, side, align));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
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
              style={{ ...contentStyle, top: position.top, left: position.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
