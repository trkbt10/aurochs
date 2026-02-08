/**
 * @file Shape locking types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2 - Locking
 */

// =============================================================================
// Shape Locking Types
// =============================================================================

/**
 * Group shape locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.21 (CT_GroupLocking)
 */
export type GroupLocks = {
  readonly noGrp?: boolean;
  readonly noUngrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
};

/**
 * Connector shape locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.11 (CT_ConnectorLocking)
 */
export type ConnectorLocks = {
  readonly noGrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
  readonly noEditPoints?: boolean;
  readonly noAdjustHandles?: boolean;
  readonly noChangeArrowheads?: boolean;
  readonly noChangeShapeType?: boolean;
};

/**
 * Picture shape locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.31 (CT_PictureLocking)
 */
export type PictureLocks = {
  readonly noGrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
  readonly noEditPoints?: boolean;
  readonly noAdjustHandles?: boolean;
  readonly noChangeArrowheads?: boolean;
  readonly noChangeShapeType?: boolean;
  readonly noCrop?: boolean;
};

/**
 * Shape locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.34 (CT_ShapeLocking)
 */
export type ShapeLocks = {
  readonly noGrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
  readonly noEditPoints?: boolean;
  readonly noAdjustHandles?: boolean;
  readonly noChangeArrowheads?: boolean;
  readonly noChangeShapeType?: boolean;
  readonly noTextEdit?: boolean;
};

/**
 * Content part locking
 * @see ECMA-376 Part 1, Section 20.1.2.2.43 (CT_ContentPartLocking)
 */
export type ContentPartLocks = {
  readonly noGrp?: boolean;
  readonly noSelect?: boolean;
  readonly noRot?: boolean;
  readonly noChangeAspect?: boolean;
  readonly noMove?: boolean;
  readonly noResize?: boolean;
  readonly noEditPoints?: boolean;
  readonly noAdjustHandles?: boolean;
  readonly noChangeArrowheads?: boolean;
  readonly noChangeShapeType?: boolean;
};
