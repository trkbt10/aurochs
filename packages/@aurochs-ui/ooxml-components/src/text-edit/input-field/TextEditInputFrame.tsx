/**
 * @file Text edit input frame adapter
 *
 * Re-exports the shared TextEditInputFrame from editor-controls/text-edit
 * with PPTX-specific prop names (slideWidth/slideHeight) mapped to
 * the canonical props (canvasWidth/canvasHeight).
 */

import type {
  ChangeEventHandler,
  KeyboardEventHandler,
  CompositionEventHandler,
  ReactEventHandler,
  MouseEventHandler,
  ReactNode,
  RefObject,
} from "react";
import { TextEditInputFrame as SharedTextEditInputFrame } from "@aurochs-ui/editor-controls/text-edit";
import type { TextEditBounds } from "@aurochs-ui/editor-core/text-edit";

export type TextEditInputFrameProps = {
  readonly bounds: TextEditBounds;
  /** Slide width in domain units (mapped to canvasWidth) */
  readonly slideWidth: number;
  /** Slide height in domain units (mapped to canvasHeight) */
  readonly slideHeight: number;
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

/**
 * PPTX-specific adapter for the shared TextEditInputFrame.
 * Maps slideWidth/slideHeight to canvasWidth/canvasHeight.
 */
export function TextEditInputFrame({
  slideWidth,
  slideHeight,
  ...rest
}: TextEditInputFrameProps) {
  return (
    <SharedTextEditInputFrame
      canvasWidth={slideWidth}
      canvasHeight={slideHeight}
      {...rest}
    />
  );
}
