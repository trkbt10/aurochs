/**
 * @file Text edit input frame component
 *
 * Hosts the hidden textarea and positions the text overlay within the shape bounds.
 */

import type {
  ChangeEventHandler,
  KeyboardEventHandler,
  CompositionEventHandler,
  ReactEventHandler,
  ReactNode,
  RefObject,
  CSSProperties,
} from "react";
import type { TextEditBounds } from "../input-support/state";
import { colorTokens } from "../../../ui/design-tokens";

export type TextEditInputFrameProps = {
  readonly bounds: TextEditBounds;
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLTextAreaElement>;
  readonly onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  readonly onSelect: ReactEventHandler<HTMLTextAreaElement>;
  readonly onCompositionStart: CompositionEventHandler<HTMLTextAreaElement>;
  readonly onCompositionUpdate: CompositionEventHandler<HTMLTextAreaElement>;
  readonly onCompositionEnd: CompositionEventHandler<HTMLTextAreaElement>;
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
};

function buildContainerStyle(
  bounds: TextEditBounds,
  slideWidth: number,
  slideHeight: number,
): CSSProperties {
  const left = ((bounds.x as number) / slideWidth) * 100;
  const top = ((bounds.y as number) / slideHeight) * 100;
  const width = ((bounds.width as number) / slideWidth) * 100;
  const height = ((bounds.height as number) / slideHeight) * 100;

  return {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    transform: bounds.rotation !== 0 ? `rotate(${bounds.rotation}deg)` : undefined,
    transformOrigin: "center center",
    boxSizing: "border-box",
    border: `2px solid ${colorTokens.selection.primary}`,
    borderRadius: "2px",
    backgroundColor: "transparent",
    zIndex: 1000,
    overflow: "visible",
  };
}

export function TextEditInputFrame({
  bounds,
  slideWidth,
  slideHeight,
  textareaRef,
  value,
  onChange,
  onKeyDown,
  onSelect,
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd,
  children,
}: TextEditInputFrameProps) {
  const containerStyle = buildContainerStyle(bounds, slideWidth, slideHeight);

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
