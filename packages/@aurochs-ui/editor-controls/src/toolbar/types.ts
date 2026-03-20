/**
 * @file Shared toolbar button group types
 *
 * Props use primitive types only — no format-specific types leak into these components.
 */

// --- UndoRedo ---

export type UndoRedoGroupProps = {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly disabled?: boolean;
};

// --- Alignment ---

export type AlignmentValue = "left" | "center" | "right" | "justify";

export type AlignmentGroupProps = {
  /** Single value when uniform, array when selection contains multiple values. */
  readonly value: AlignmentValue | AlignmentValue[] | undefined;
  readonly onChange: (alignment: AlignmentValue | undefined) => void;
  readonly showJustify?: boolean;
  readonly disabled?: boolean;
};

// --- VerticalAlignment ---

export type VerticalAlignmentValue = "top" | "center" | "bottom";

export type VerticalAlignmentGroupProps = {
  /** Single value when uniform, array when selection contains multiple values. */
  readonly value: VerticalAlignmentValue | VerticalAlignmentValue[] | undefined;
  readonly onChange: (alignment: VerticalAlignmentValue | undefined) => void;
  readonly disabled?: boolean;
};

// --- WrapText ---

export type WrapTextButtonProps = {
  readonly pressed: boolean | "mixed";
  readonly onChange: (pressed: boolean) => void;
  readonly disabled?: boolean;
};

// --- DeleteDuplicate ---

export type DeleteDuplicateGroupProps = {
  readonly onDelete: () => void;
  readonly onDuplicate?: () => void;
  readonly disabled?: boolean;
};

// --- ListIndent ---

export type ListToggle = {
  readonly pressed: boolean;
  readonly onToggle: () => void;
};

export type ListIndentGroupProps = {
  readonly bullet?: ListToggle;
  readonly numbered?: ListToggle;
  readonly onIncreaseIndent?: () => void;
  readonly onDecreaseIndent?: () => void;
  readonly disabled?: boolean;
};

