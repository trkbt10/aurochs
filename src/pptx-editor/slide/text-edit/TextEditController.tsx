/**
 * @file Text Edit Controller Component
 *
 * Provides a hybrid text editing experience:
 * - Hidden textarea captures input and tracks cursor/selection
 * - Visual text is rendered as SVG on top
 * - IME composition (未確定文字) is displayed with underline
 * - Cursor and selection are overlaid
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
  type CompositionEvent,
} from "react";
import { toLayoutInput, layoutTextBody } from "../../../pptx/render/text-layout";
import {
  getPlainText,
  offsetToCursorPosition,
  cursorPositionToCoordinates,
  selectionToRects,
  mergeTextIntoBody,
  extractDefaultRunProperties,
} from "./cursor";
import { colorTokens } from "../../ui/design-tokens";
import { TextOverlay } from "./TextOverlay";
import { CursorCaret } from "./CursorCaret";
import { EMPTY_COLOR_CONTEXT, HIDDEN_TEXTAREA_STYLE, buildContainerStyle } from "./styles";
import type { TextEditControllerProps, CursorState, CompositionState } from "./types";

// =============================================================================
// Re-exports for backward compatibility
// =============================================================================

export type { TextEditControllerProps, CursorState } from "./types";

// =============================================================================
// Initial State
// =============================================================================

const INITIAL_COMPOSITION_STATE: CompositionState = {
  isComposing: false,
  text: "",
  startOffset: 0,
};

const INITIAL_CURSOR_STATE: CursorState = {
  cursor: undefined,
  selectionRects: [],
  isBlinking: true,
};

// =============================================================================
// Component
// =============================================================================

/**
 * Text edit controller with live text preview and IME support.
 */
export function TextEditController({
  bounds,
  textBody,
  colorContext,
  fontScheme,
  slideWidth,
  slideHeight,
  onComplete,
  onCancel,
}: TextEditControllerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentText, setCurrentText] = useState(() => getPlainText(textBody));
  const [composition, setComposition] = useState<CompositionState>(INITIAL_COMPOSITION_STATE);
  const initialTextRef = useRef(getPlainText(textBody));
  const finishedRef = useRef(false);

  // Extract default run properties from original text body (memoized)
  const defaultRunProperties = useMemo(
    () => extractDefaultRunProperties(textBody),
    [textBody],
  );

  // Compute current TextBody from edited text
  const currentTextBody = useMemo(
    () => mergeTextIntoBody(textBody, currentText, defaultRunProperties),
    [textBody, currentText, defaultRunProperties],
  );

  // Compute layout result for current text
  const layoutResult = useMemo(() => {
    const input = toLayoutInput({
      body: currentTextBody,
      width: bounds.width,
      height: bounds.height,
      colorContext: colorContext ?? EMPTY_COLOR_CONTEXT,
      fontScheme,
    });
    return layoutTextBody(input);
  }, [currentTextBody, bounds.width, bounds.height, colorContext, fontScheme]);

  // Cursor state
  const [cursorState, setCursorState] = useState<CursorState>(INITIAL_CURSOR_STATE);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Update cursor position
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    const hasSelection = selectionStart !== selectionEnd;

    if (hasSelection) {
      const startPos = offsetToCursorPosition(currentTextBody, selectionStart);
      const endPos = offsetToCursorPosition(currentTextBody, selectionEnd);
      const rects = selectionToRects({ start: startPos, end: endPos }, layoutResult);

      setCursorState({
        cursor: undefined,
        selectionRects: rects,
        isBlinking: false,
      });
    } else {
      const cursorPos = offsetToCursorPosition(currentTextBody, selectionStart);
      const coords = cursorPositionToCoordinates(cursorPos, layoutResult);

      setCursorState({
        cursor: coords,
        selectionRects: [],
        isBlinking: !composition.isComposing,
      });
    }
  }, [currentTextBody, layoutResult, composition.isComposing]);

  // Handle selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      updateCursorPosition();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateCursorPosition]);

  // Update cursor on layout changes
  useEffect(() => {
    updateCursorPosition();
  }, [layoutResult, updateCursorPosition]);

  // Handle text changes
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCurrentText(newText);
    requestAnimationFrame(() => {
      updateCursorPosition();
    });
  }, [updateCursorPosition]);

  // IME composition handlers
  const handleCompositionStart = useCallback((e: CompositionEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    setComposition({
      isComposing: true,
      text: "",
      startOffset: textarea.selectionStart,
    });
  }, []);

  const handleCompositionUpdate = useCallback((e: CompositionEvent<HTMLTextAreaElement>) => {
    setComposition((prev) => ({
      ...prev,
      text: e.data,
    }));
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setComposition(INITIAL_COMPOSITION_STATE);
  }, []);

  // Handle key events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (composition.isComposing) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        finishedRef.current = true;
        onCancel();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finishedRef.current = true;
        onComplete(currentText);
      }
    },
    [currentText, onCancel, onComplete, composition.isComposing],
  );

  // Ref to track latest values for unmount callback
  const latestRef = useRef({
    currentText,
    initialText: initialTextRef.current,
    onComplete,
  });
  latestRef.current = {
    currentText,
    initialText: initialTextRef.current,
    onComplete,
  };

  // Save text on unmount
  useEffect(() => {
    return () => {
      if (finishedRef.current) {
        return;
      }
      const { currentText: text, initialText, onComplete: complete } = latestRef.current;
      if (text !== initialText) {
        complete(text);
      }
    };
  }, []);

  const containerStyle = buildContainerStyle(bounds, slideWidth, slideHeight);
  const boundsWidth = bounds.width as number;
  const boundsHeight = bounds.height as number;

  return (
    <div style={containerStyle}>
      {/* Hidden textarea for input */}
      <textarea
        ref={textareaRef}
        value={currentText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={updateCursorPosition}
        onClick={updateCursorPosition}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        style={HIDDEN_TEXTAREA_STYLE}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />

      {/* Text and cursor overlay */}
      <svg
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
        }}
        viewBox={`0 0 ${boundsWidth} ${boundsHeight}`}
        preserveAspectRatio="xMinYMin meet"
      >
        {/* Rendered text */}
        <TextOverlay
          layoutResult={layoutResult}
          composition={composition}
          cursorOffset={textareaRef.current?.selectionStart ?? 0}
        />

        {/* Selection highlights */}
        {cursorState.selectionRects.map((rect, index) => (
          <rect
            key={`sel-${index}`}
            x={rect.x as number}
            y={rect.y as number}
            width={rect.width as number}
            height={rect.height as number}
            fill={colorTokens.selection.primary}
            fillOpacity={0.3}
          />
        ))}

        {/* Cursor caret */}
        <CursorCaret
          cursor={cursorState.cursor}
          isBlinking={cursorState.isBlinking}
        />
      </svg>
    </div>
  );
}
