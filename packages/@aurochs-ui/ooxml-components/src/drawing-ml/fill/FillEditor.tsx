/**
 * @file FillEditor - PPTX fill editor wrapping BaseFillEditor with blipFill support.
 */

import type { CSSProperties } from "react";
import { BaseFillEditor } from "@aurochs-ui/editor-controls/editors";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { blipFillExtension } from "./blip-fill-extension";

// =============================================================================
// Types
// =============================================================================

export type FillEditorProps = EditorProps<BaseFill> & {
  readonly style?: CSSProperties;
  /** Limit fill types shown */
  readonly allowedTypes?: readonly BaseFill["type"][];
  /** Compact mode: single swatch with popover */
  readonly compact?: boolean;
};

const extensions = [blipFillExtension];

// =============================================================================
// Component
// =============================================================================

/**
 * PPTX fill editor with image fill (blipFill) support.
 * Delegates to BaseFillEditor with blipFill extension.
 */
export function FillEditor({ value, onChange, disabled, className, style, allowedTypes, compact }: FillEditorProps) {
  return (
    <BaseFillEditor
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
      style={style}
      allowedTypes={allowedTypes}
      compact={compact}
      extensions={extensions}
    />
  );
}

