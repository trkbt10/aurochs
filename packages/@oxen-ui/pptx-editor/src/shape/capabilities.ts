/**
 * @file Shape capabilities
 *
 * Shape editing capabilities based on ECMA-376 lock attributes.
 */

import type { Shape } from "@oxen/pptx/domain";

// =============================================================================
// Types
// =============================================================================

/**
 * Shape editing capabilities based on ECMA-376 lock attributes.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2 (Shape Locks)
 * @see ECMA-376 Part 1, Section 20.1.2.2.19 (GraphicFrameLocks)
 */
export type ShapeCapabilities = {
  /** Whether the shape can be resized */
  readonly canResize: boolean;
  /** Whether the shape can be rotated */
  readonly canRotate: boolean;
  /** Whether aspect ratio must be locked during resize */
  readonly aspectLocked: boolean;
  /** Whether the shape can be moved */
  readonly canMove: boolean;
  /** Whether the shape can be selected */
  readonly canSelect: boolean;
  /** Whether the shape can be grouped */
  readonly canGroup: boolean;
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Default capabilities (all operations allowed)
 */
const defaultCapabilities: ShapeCapabilities = {
  canResize: true,
  canRotate: true,
  aspectLocked: false,
  canMove: true,
  canSelect: true,
  canGroup: true,
};

/**
 * Get shape editing capabilities based on ECMA-376 lock attributes.
 *
 * This function examines the lock properties on each shape type:
 * - sp (SpShape): shapeLocks
 * - pic (PicShape): pictureLocks
 * - grpSp (GrpShape): groupLocks
 * - cxnSp (CxnShape): (no locks defined, always editable)
 * - graphicFrame (GraphicFrame): graphicFrameLocks
 * - contentPart (ContentPartShape): (no editing support)
 *
 * @param shape - The shape to check
 * @returns ShapeCapabilities indicating what operations are allowed
 */
export function getShapeCapabilities(shape: Shape): ShapeCapabilities {
  switch (shape.type) {
    case "sp": {
      const locks = shape.nonVisual.shapeLocks;
      if (!locks) {
        return defaultCapabilities;
      }
      return {
        canResize: locks.noResize !== true,
        canRotate: locks.noRot !== true,
        aspectLocked: locks.noChangeAspect === true,
        canMove: locks.noMove !== true,
        canSelect: locks.noSelect !== true,
        canGroup: locks.noGrp !== true,
      };
    }

    case "pic": {
      const locks = shape.nonVisual.pictureLocks;
      if (!locks) {
        return defaultCapabilities;
      }
      return {
        canResize: locks.noResize !== true,
        canRotate: locks.noRot !== true,
        aspectLocked: locks.noChangeAspect === true,
        canMove: locks.noMove !== true,
        canSelect: locks.noSelect !== true,
        canGroup: locks.noGrp !== true,
      };
    }

    case "grpSp": {
      const locks = shape.nonVisual.groupLocks;
      if (!locks) {
        return defaultCapabilities;
      }
      return {
        canResize: locks.noResize !== true,
        canRotate: locks.noRot !== true,
        aspectLocked: locks.noChangeAspect === true,
        canMove: locks.noMove !== true,
        canSelect: locks.noSelect !== true,
        canGroup: locks.noGrp !== true,
      };
    }

    case "cxnSp": {
      // CxnShape has no lock properties, always editable
      return defaultCapabilities;
    }

    case "graphicFrame": {
      const locks = shape.nonVisual.graphicFrameLocks;
      if (!locks) {
        return defaultCapabilities;
      }
      return {
        canResize: locks.noResize !== true,
        canRotate: true, // graphicFrameLocks has no noRot
        aspectLocked: locks.noChangeAspect === true,
        canMove: locks.noMove !== true,
        canSelect: locks.noSelect !== true,
        canGroup: locks.noGrp !== true,
      };
    }

    case "contentPart": {
      // ContentPart is not directly editable in the slide editor
      return {
        canResize: false,
        canRotate: false,
        aspectLocked: false,
        canMove: false,
        canSelect: false,
        canGroup: false,
      };
    }
  }
}
