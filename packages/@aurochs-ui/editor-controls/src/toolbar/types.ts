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
  readonly value: AlignmentValue | undefined;
  readonly onChange: (alignment: AlignmentValue | undefined) => void;
  readonly showJustify?: boolean;
  readonly mixed?: boolean;
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

