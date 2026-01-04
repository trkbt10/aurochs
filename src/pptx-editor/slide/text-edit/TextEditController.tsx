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
  type CSSProperties,
  type KeyboardEvent,
  type ChangeEvent,
  type CompositionEvent,
  type ReactNode,
} from "react";
import type { TextBody } from "../../../pptx/domain";
import type { ColorContext, FontScheme } from "../../../pptx/domain/resolution";
import type { Pixels } from "../../../pptx/domain/types";
import type { LayoutResult, LayoutLine, PositionedSpan } from "../../../pptx/render/text-layout";
import { toLayoutInput, layoutTextBody } from "../../../pptx/render/text-layout";
import {
  getPlainText,
  offsetToCursorPosition,
  cursorPositionToCoordinates,
  selectionToRects,
  mergeTextIntoBody,
  extractDefaultRunProperties,
  type CursorCoordinates,
  type SelectionRect,
} from "./cursor";
import { fontSizeToPixels, getTextVisualBounds } from "./text-geometry";
import type { TextEditBounds } from "./state";
import { colorTokens } from "../../ui/design-tokens";

// =============================================================================
// Constants
// =============================================================================

/** Empty color context for fallback */
const EMPTY_COLOR_CONTEXT: ColorContext = {
  colorScheme: {},
  colorMap: {},
};

// =============================================================================
// Types
// =============================================================================

export type TextEditControllerProps = {
  /** Bounds of the text editing area */
  readonly bounds: TextEditBounds;
  /** Initial text body */
  readonly textBody: TextBody;
  /** Color context for style resolution */
  readonly colorContext?: ColorContext;
  /** Font scheme for theme fonts */
  readonly fontScheme?: FontScheme;
  /** Slide dimensions for positioning */
  readonly slideWidth: number;
  readonly slideHeight: number;
  /** Called when editing is complete */
  readonly onComplete: (newText: string) => void;
  /** Called when editing is cancelled */
  readonly onCancel: () => void;
};

export type CursorState = {
  /** Cursor coordinates (or undefined if no layout) */
  readonly cursor: CursorCoordinates | undefined;
  /** Selection rectangles */
  readonly selectionRects: readonly SelectionRect[];
  /** Whether cursor should blink */
  readonly isBlinking: boolean;
};

type CompositionState = {
  /** Whether currently composing (IME active) */
  readonly isComposing: boolean;
  /** The composition text (未確定文字) */
  readonly text: string;
  /** Start position of composition */
  readonly startOffset: number;
};

// =============================================================================
// Styles
// =============================================================================

const hiddenTextareaStyle: CSSProperties = {
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
  // Keep textarea in DOM flow for IME positioning
  caretColor: "transparent",
};

function getContainerStyle(
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
  const [composition, setComposition] = useState<CompositionState>({
    isComposing: false,
    text: "",
    startOffset: 0,
  });
  const initialTextRef = useRef(getPlainText(textBody));

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
  const [cursorState, setCursorState] = useState<CursorState>({
    cursor: undefined,
    selectionRects: [],
    isBlinking: true,
  });

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
    setComposition({
      isComposing: false,
      text: "",
      startOffset: 0,
    });
    // Text is already updated via onChange
  }, []);

  // Handle key events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Don't handle keys during IME composition
      if (composition.isComposing) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onComplete(currentText);
      }
    },
    [currentText, onCancel, onComplete, composition.isComposing],
  );

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const container = textareaRef.current?.parentElement;
      if (container && !container.contains(e.target as Node)) {
        if (currentText !== initialTextRef.current) {
          onComplete(currentText);
        } else {
          onCancel();
        }
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [currentText, onComplete, onCancel]);

  const containerStyle = getContainerStyle(bounds, slideWidth, slideHeight);
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
        style={hiddenTextareaStyle}
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

// =============================================================================
// Text Overlay Component
// =============================================================================

type TextOverlayProps = {
  readonly layoutResult: LayoutResult;
  readonly composition: CompositionState;
  readonly cursorOffset: number;
};

/**
 * Renders text from LayoutResult as SVG elements.
 */
function TextOverlay({ layoutResult, composition }: TextOverlayProps) {
  const elements: ReactNode[] = [];
  // eslint-disable-next-line no-restricted-syntax -- key generation
  let key = 0;

  for (const para of layoutResult.paragraphs) {
    // Render bullet if present
    if (para.bullet !== undefined && para.lines.length > 0) {
      const firstLine = para.lines[0];
      const bulletX = (firstLine.x as number) - (para.bulletWidth as number);
      const bulletY = firstLine.y as number;
      const bulletFontSizePx = fontSizeToPixels(para.bullet.fontSize);
      const bulletBounds = getTextVisualBounds(bulletY as Pixels, para.bullet.fontSize);

      if (para.bullet.imageUrl !== undefined) {
        const imageSize = bulletFontSizePx as number;
        elements.push(
          <image
            key={`bullet-${key++}`}
            href={para.bullet.imageUrl}
            x={bulletX}
            y={bulletBounds.topY as number}
            width={imageSize}
            height={imageSize}
            preserveAspectRatio="xMidYMid meet"
          />,
        );
      } else {
        elements.push(
          <text
            key={`bullet-${key++}`}
            x={bulletX}
            y={bulletY}
            fontSize={`${bulletFontSizePx as number}px`}
            fill={para.bullet.color}
            fontFamily={para.bullet.fontFamily}
          >
            {para.bullet.char}
          </text>,
        );
      }
    }

    // Render lines
    for (const line of para.lines) {
      const lineElements = renderLine(line, key);
      elements.push(...lineElements);
      key += line.spans.length + 1;
    }
  }

  // Render IME composition underline
  if (composition.isComposing && composition.text) {
    // TODO: Calculate composition underline position
    // For now, composition text is included in currentText via textarea
  }

  return <>{elements}</>;
}

/**
 * Render a line of text
 */
function renderLine(line: LayoutLine, startKey: number): ReactNode[] {
  const elements: ReactNode[] = [];
  // eslint-disable-next-line no-restricted-syntax -- accumulating position
  let cursorX = line.x as number;
  // eslint-disable-next-line no-restricted-syntax -- key generation
  let key = startKey;

  for (const span of line.spans) {
    if (span.text.length === 0) {
      continue;
    }

    const element = renderSpan(span, cursorX, line.y as number, key++);
    elements.push(element);
    cursorX += (span.width as number) + (span.dx as number);
  }

  return elements;
}

/**
 * Render a single span
 */
function renderSpan(
  span: PositionedSpan,
  x: number,
  lineY: number,
  key: number,
): ReactNode {
  const fontSizePx = fontSizeToPixels(span.fontSize);
  const bounds = getTextVisualBounds(lineY as Pixels, span.fontSize);
  const elements: ReactNode[] = [];

  // Handle highlight background
  if (span.highlightColor !== undefined) {
    elements.push(
      <rect
        key={`hl-${key}`}
        x={x}
        y={bounds.topY as number}
        width={span.width as number}
        height={fontSizePx as number}
        fill={span.highlightColor}
      />,
    );
  }

  // Build text props
  const textProps: Record<string, string | number | undefined> = {
    x,
    y: lineY,
    fontSize: `${fontSizePx as number}px`,
    fontFamily: span.fontFamily,
  };

  // Handle fill
  if (span.textFill !== undefined) {
    if (span.textFill.type === "noFill") {
      textProps.fill = "none";
    } else if (span.textFill.type === "solid") {
      textProps.fill = span.textFill.color;
      if (span.textFill.alpha < 1) {
        textProps.fillOpacity = span.textFill.alpha;
      }
    }
  } else {
    textProps.fill = span.color;
  }

  // Font styling
  if (span.fontWeight !== 400) {
    textProps.fontWeight = span.fontWeight;
  }
  if (span.fontStyle !== "normal") {
    textProps.fontStyle = span.fontStyle;
  }
  if (span.textDecoration !== undefined) {
    textProps.textDecoration = span.textDecoration;
  }

  // Apply text transform
  const textContent = applyTextTransform(span.text, span.textTransform);

  elements.push(
    <text key={`text-${key}`} {...textProps}>
      {textContent}
    </text>,
  );

  return <>{elements}</>;
}

function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | undefined,
): string {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  return text;
}

// =============================================================================
// Cursor Caret Component
// =============================================================================

type CursorCaretProps = {
  readonly cursor: CursorCoordinates | undefined;
  readonly isBlinking: boolean;
};

/**
 * Renders blinking cursor caret.
 */
function CursorCaret({ cursor, isBlinking }: CursorCaretProps) {
  const [visible, setVisible] = useState(true);

  // Blink effect
  useEffect(() => {
    if (!isBlinking || !cursor) {
      setVisible(true);
      return;
    }

    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 530);

    return () => {
      clearInterval(interval);
    };
  }, [isBlinking, cursor]);

  // Reset visibility when cursor changes
  useEffect(() => {
    setVisible(true);
  }, [cursor?.x, cursor?.y]);

  if (!cursor || !visible) {
    return null;
  }

  return (
    <line
      x1={cursor.x as number}
      y1={cursor.y as number}
      x2={cursor.x as number}
      y2={(cursor.y as number) + (cursor.height as number)}
      stroke="#000"
      strokeWidth={1.5}
    />
  );
}
