/**
 * @file Text edit input frame component
 *
 * Hosts a hidden textarea and positions a text overlay within shape bounds.
 * Format-agnostic - works with any canvas that uses percentage-based positioning.
 */

import type {
  ChangeEventHandler,
  KeyboardEventHandler,
  CompositionEventHandler,
  ReactEventHandler,
  MouseEventHandler,
  ReactNode,
  RefObject,
  CSSProperties,
} from "react";
import type { TextEditBounds } from "@aurochs-ui/editor-core/text-edit";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

export type TextEditInputFrameProps = {
  readonly bounds: TextEditBounds;
  /** Canvas width in domain units (for percentage calculation) */
  readonly canvasWidth: number;
  /** Canvas height in domain units (for percentage calculation) */
  readonly canvasHeight: number;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLTextAreaElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  readonly onSelect: ReactEventHandler<HTMLTextAreaElement>;
  readonly onCompositionStart: CompositionEventHandler<HTMLTextAreaElement>;
  readonly onCompositionUpdate: CompositionEventHandler<HTMLTextAreaElement>;
  readonly onCompositionEnd: CompositionEventHandler<HTMLTextAreaElement>;
  readonly onNonPrimaryMouseDown?: MouseEventHandler<HTMLTextAreaElement>;
  readonly onContextMenuCapture?: MouseEventHandler<HTMLTextAreaElement>;
  readonly showFrameOutline?: boolean;
  readonly children: ReactNode;
};

const HIDDEN_TEXTAREA_STYLE: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "text",
  resize: "none",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  overflow: "hidden",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  pointerEvents: "auto",
  caretColor: "transparent",
  zIndex: 1,
};

function buildContainerStyle({
  bounds,
  canvasWidth,
  canvasHeight,
  showFrameOutline,
}: {
  readonly bounds: TextEditBounds;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly showFrameOutline: boolean;
}): CSSProperties {
  const left = (bounds.x / canvasWidth) * 100;
  const top = (bounds.y / canvasHeight) * 100;
  const width = (bounds.width / canvasWidth) * 100;
  const height = (bounds.height / canvasHeight) * 100;

  return {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    transform: bounds.rotation !== 0 ? `rotate(${bounds.rotation}deg)` : undefined,
    transformOrigin: "center center",
    boxSizing: "border-box",
    border: showFrameOutline ? `2px solid ${colorTokens.selection.primary}` : "none",
    borderRadius: "2px",
    backgroundColor: "transparent",
    zIndex: 1000,
    overflow: "visible",
  };
}

/**
 * Text edit input frame that hosts a hidden textarea and overlay content.
 * Positions itself within a canvas using percentage-based layout.
 */
export function TextEditInputFrame({
  bounds,
  canvasWidth,
  canvasHeight,
  textareaRef,
  value,
  onChange,
  onKeyDown,
  onSelect,
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd,
  onNonPrimaryMouseDown,
  onContextMenuCapture,
  showFrameOutline = true,
  children,
}: TextEditInputFrameProps) {
  const containerStyle = buildContainerStyle({ bounds, canvasWidth, canvasHeight, showFrameOutline });
  const handleMouseDown: MouseEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.button !== 0) {
      onNonPrimaryMouseDown?.(event);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div style={containerStyle}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCompositionEnd={onCompositionEnd}
        onMouseDown={handleMouseDown}
        onContextMenuCapture={onContextMenuCapture}
        style={HIDDEN_TEXTAREA_STYLE}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      {children}
    </div>
  );
}
