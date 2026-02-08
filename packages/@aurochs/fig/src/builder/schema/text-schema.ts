/**
 * @file Extended schema definitions for TEXT nodes and AutoLayout
 *
 * This extends the base test schema with text-specific and AutoLayout types.
 */

import type { KiwiSchema, KiwiDefinition } from "../../types";
import { KIWI_TYPE } from "../../kiwi/schema";

// =============================================================================
// Enum Helpers
// =============================================================================

function createEnumDef(
  name: string,
  values: [string, number][]
): KiwiDefinition {
  return {
    name,
    kind: "ENUM",
    fields: values.map(([fieldName, value]) => ({
      name: fieldName,
      type: "uint",
      typeId: KIWI_TYPE.UINT,
      isArray: false,
      value,
    })),
  };
}

function createStructDef(
  name: string,
  fields: { name: string; type: string; typeId: number }[]
): KiwiDefinition {
  return {
    name,
    kind: "STRUCT",
    fields: fields.map((f, i) => ({
      name: f.name,
      type: f.type,
      typeId: f.typeId,
      isArray: false,
      value: i + 1,
    })),
  };
}

// =============================================================================
// Text-Extended Schema
// =============================================================================

/**
 * Create a schema that supports TEXT nodes and AutoLayout with all properties.
 *
 * Definition indices:
 * 0: MessageType
 * 1: NodeType
 * 2: NodePhase
 * 3: BlendMode
 * 4: GUID
 * 5: Vector
 * 6: Matrix
 * 7: Color
 * 8: TextAlignHorizontal
 * 9: TextAlignVertical
 * 10: TextAutoResize
 * 11: TextDecoration
 * 12: TextCase
 * 13: NumberUnits
 * 14: ValueWithUnits
 * 15: FontName
 * 16: Paint
 * 17: PaintType
 * 18: StrokeAlign
 * 19: TextData
 * 20: StackMode (AutoLayout)
 * 21: StackAlign (AutoLayout)
 * 22: StackPositioning (AutoLayout)
 * 23: StackSizing (AutoLayout)
 * 24: ConstraintType
 * 25: StackPadding
 * 26: NodeChange
 * 27: Message
 * 28: ParentIndex
 */
export function createTextSchema(): KiwiSchema {
  return {
    definitions: [
      // 0: MessageType enum
      createEnumDef("MessageType", [
        ["JOIN_START", 0],
        ["NODE_CHANGES", 1],
        ["USER_CHANGES", 2],
      ]),

      // 1: NodeType enum (from Figma's schema)
      createEnumDef("NodeType", [
        ["NONE", 0],
        ["DOCUMENT", 1],
        ["CANVAS", 2],
        ["GROUP", 3],
        ["FRAME", 4],
        ["BOOLEAN_OPERATION", 5],
        ["VECTOR", 6],
        ["STAR", 7],
        ["LINE", 8],
        ["ELLIPSE", 9],
        ["RECTANGLE", 10],
        ["REGULAR_POLYGON", 11],
        ["ROUNDED_RECTANGLE", 12],
        ["TEXT", 13],
        ["SLICE", 14],
        ["SYMBOL", 15],
        ["INSTANCE", 16],
        ["STICKY", 17],
        ["SHAPE_WITH_TEXT", 18],
        ["CONNECTOR", 19],
        ["CODE_BLOCK", 20],
        ["WIDGET", 21],
        ["STAMP", 22],
        ["MEDIA", 23],
        ["HIGHLIGHT", 24],
        ["SECTION", 25],
        ["TABLE", 27],
        ["TABLE_CELL", 28],
        ["COMPONENT", 29],
        ["COMPONENT_SET", 30],
      ]),

      // 2: NodePhase enum
      createEnumDef("NodePhase", [
        ["CREATED", 0],
        ["REMOVED", 1],
      ]),

      // 3: BlendMode enum
      createEnumDef("BlendMode", [
        ["PASS_THROUGH", 0],
        ["NORMAL", 1],
        ["MULTIPLY", 2],
        ["DARKEN", 3],
        ["LIGHTEN", 4],
        ["SCREEN", 5],
        ["OVERLAY", 6],
        ["SOFT_LIGHT", 7],
        ["HARD_LIGHT", 8],
        ["DIFFERENCE", 9],
        ["EXCLUSION", 10],
        ["HUE", 11],
        ["SATURATION", 12],
        ["COLOR", 13],
        ["LUMINOSITY", 14],
      ]),

      // 4: GUID struct
      createStructDef("GUID", [
        { name: "sessionID", type: "uint", typeId: KIWI_TYPE.UINT },
        { name: "localID", type: "uint", typeId: KIWI_TYPE.UINT },
      ]),

      // 5: Vector struct
      createStructDef("Vector", [
        { name: "x", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "y", type: "float", typeId: KIWI_TYPE.FLOAT },
      ]),

      // 6: Matrix struct
      createStructDef("Matrix", [
        { name: "m00", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m01", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m02", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m10", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m11", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m12", type: "float", typeId: KIWI_TYPE.FLOAT },
      ]),

      // 7: Color struct
      createStructDef("Color", [
        { name: "r", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "g", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "b", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "a", type: "float", typeId: KIWI_TYPE.FLOAT },
      ]),

      // 8: TextAlignHorizontal enum
      createEnumDef("TextAlignHorizontal", [
        ["LEFT", 0],
        ["CENTER", 1],
        ["RIGHT", 2],
        ["JUSTIFIED", 3],
      ]),

      // 9: TextAlignVertical enum
      createEnumDef("TextAlignVertical", [
        ["TOP", 0],
        ["CENTER", 1],
        ["BOTTOM", 2],
      ]),

      // 10: TextAutoResize enum
      createEnumDef("TextAutoResize", [
        ["NONE", 0],
        ["WIDTH_AND_HEIGHT", 1],
        ["HEIGHT", 2],
      ]),

      // 11: TextDecoration enum
      createEnumDef("TextDecoration", [
        ["NONE", 0],
        ["UNDERLINE", 1],
        ["STRIKETHROUGH", 2],
      ]),

      // 12: TextCase enum
      createEnumDef("TextCase", [
        ["ORIGINAL", 0],
        ["UPPER", 1],
        ["LOWER", 2],
        ["TITLE", 3],
        ["SMALL_CAPS", 4],
        ["SMALL_CAPS_FORCED", 5],
      ]),

      // 13: NumberUnits enum
      createEnumDef("NumberUnits", [
        ["RAW", 0],
        ["PIXELS", 1],
        ["PERCENT", 2],
      ]),

      // 14: ValueWithUnits struct
      createStructDef("ValueWithUnits", [
        { name: "value", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "units", type: "NumberUnits", typeId: 13 },
      ]),

      // 15: FontName struct
      createStructDef("FontName", [
        { name: "family", type: "string", typeId: KIWI_TYPE.STRING },
        { name: "style", type: "string", typeId: KIWI_TYPE.STRING },
        { name: "postscript", type: "string", typeId: KIWI_TYPE.STRING },
      ]),

      // 16: Paint message (simplified)
      {
        name: "Paint",
        kind: "MESSAGE",
        fields: [
          { name: "type", type: "PaintType", typeId: 17, isArray: false, value: 1 },
          { name: "color", type: "Color", typeId: 7, isArray: false, value: 2 },
          { name: "opacity", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 3 },
          { name: "visible", type: "bool", typeId: KIWI_TYPE.BOOL, isArray: false, value: 4 },
          { name: "blendMode", type: "BlendMode", typeId: 3, isArray: false, value: 5 },
        ],
      },

      // 17: PaintType enum
      createEnumDef("PaintType", [
        ["SOLID", 0],
        ["GRADIENT_LINEAR", 1],
        ["GRADIENT_RADIAL", 2],
        ["GRADIENT_ANGULAR", 3],
        ["GRADIENT_DIAMOND", 4],
        ["IMAGE", 5],
      ]),

      // 18: StrokeAlign enum
      createEnumDef("StrokeAlign", [
        ["CENTER", 0],
        ["INSIDE", 1],
        ["OUTSIDE", 2],
      ]),

      // 19: TextData message
      {
        name: "TextData",
        kind: "MESSAGE",
        fields: [
          { name: "characters", type: "string", typeId: KIWI_TYPE.STRING, isArray: false, value: 1 },
          { name: "characterStyleIDs", type: "uint", typeId: KIWI_TYPE.UINT, isArray: true, value: 2 },
        ],
      },

      // =============================================================================
      // AutoLayout Enums (20-25)
      // =============================================================================

      // 20: StackMode enum (AutoLayout direction)
      createEnumDef("StackMode", [
        ["NONE", 0],
        ["HORIZONTAL", 1],
        ["VERTICAL", 2],
        ["WRAP", 3],
      ]),

      // 21: StackAlign enum (for primary/counter axis alignment)
      createEnumDef("StackAlign", [
        ["MIN", 0],
        ["CENTER", 1],
        ["MAX", 2],
        ["STRETCH", 3],
        ["BASELINE", 4],
        ["SPACE_BETWEEN", 5],
      ]),

      // 22: StackPositioning enum (for child nodes)
      createEnumDef("StackPositioning", [
        ["AUTO", 0],
        ["ABSOLUTE", 1],
      ]),

      // 23: StackSizing enum (for child nodes)
      createEnumDef("StackSizing", [
        ["FIXED", 0],
        ["FILL", 1],
        ["HUG", 2],
      ]),

      // 24: ConstraintType enum (for non-AutoLayout constraints)
      createEnumDef("ConstraintType", [
        ["MIN", 0],
        ["CENTER", 1],
        ["MAX", 2],
        ["STRETCH", 3],
        ["SCALE", 4],
      ]),

      // 25: StackPadding struct
      createStructDef("StackPadding", [
        { name: "top", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "right", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "bottom", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "left", type: "float", typeId: KIWI_TYPE.FLOAT },
      ]),

      // =============================================================================
      // Core Message Types (26-28)
      // =============================================================================

      // 26: NodeChange message (extended for TEXT and AutoLayout)
      {
        name: "NodeChange",
        kind: "MESSAGE",
        fields: [
          // Base node fields (1-15)
          { name: "guid", type: "GUID", typeId: 4, isArray: false, value: 1 },
          { name: "phase", type: "NodePhase", typeId: 2, isArray: false, value: 2 },
          { name: "parentIndex", type: "ParentIndex", typeId: 28, isArray: false, value: 3 },
          { name: "type", type: "NodeType", typeId: 1, isArray: false, value: 4 },
          { name: "name", type: "string", typeId: KIWI_TYPE.STRING, isArray: false, value: 5 },
          { name: "visible", type: "bool", typeId: KIWI_TYPE.BOOL, isArray: false, value: 6 },
          { name: "opacity", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 8 },
          { name: "blendMode", type: "BlendMode", typeId: 3, isArray: false, value: 9 },
          { name: "size", type: "Vector", typeId: 5, isArray: false, value: 11 },
          { name: "transform", type: "Matrix", typeId: 6, isArray: false, value: 12 },
          { name: "clipsContent", type: "bool", typeId: KIWI_TYPE.BOOL, isArray: false, value: 13 },
          { name: "cornerRadius", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 14 },

          // Text-specific fields (20-33)
          { name: "fontSize", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 20 },
          { name: "fontName", type: "FontName", typeId: 15, isArray: false, value: 21 },
          { name: "textAlignHorizontal", type: "TextAlignHorizontal", typeId: 8, isArray: false, value: 22 },
          { name: "textAlignVertical", type: "TextAlignVertical", typeId: 9, isArray: false, value: 23 },
          { name: "textAutoResize", type: "TextAutoResize", typeId: 10, isArray: false, value: 24 },
          { name: "textDecoration", type: "TextDecoration", typeId: 11, isArray: false, value: 25 },
          { name: "textCase", type: "TextCase", typeId: 12, isArray: false, value: 26 },
          { name: "lineHeight", type: "ValueWithUnits", typeId: 14, isArray: false, value: 27 },
          { name: "letterSpacing", type: "ValueWithUnits", typeId: 14, isArray: false, value: 28 },
          { name: "textData", type: "TextData", typeId: 19, isArray: false, value: 29 },
          { name: "fillPaints", type: "Paint", typeId: 16, isArray: true, value: 30 },
          { name: "strokeWeight", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 31 },
          { name: "strokeAlign", type: "StrokeAlign", typeId: 18, isArray: false, value: 32 },
          { name: "strokePaints", type: "Paint", typeId: 16, isArray: true, value: 33 },

          // AutoLayout fields - frame level (40-49)
          { name: "stackMode", type: "StackMode", typeId: 20, isArray: false, value: 40 },
          { name: "stackSpacing", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 41 },
          { name: "stackPadding", type: "StackPadding", typeId: 25, isArray: false, value: 42 },
          { name: "stackPrimaryAlignItems", type: "StackAlign", typeId: 21, isArray: false, value: 43 },
          { name: "stackCounterAlignItems", type: "StackAlign", typeId: 21, isArray: false, value: 44 },
          { name: "stackPrimaryAlignContent", type: "StackAlign", typeId: 21, isArray: false, value: 45 },
          { name: "stackWrap", type: "bool", typeId: KIWI_TYPE.BOOL, isArray: false, value: 46 },
          { name: "stackCounterSpacing", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 47 },
          { name: "itemReverseZIndex", type: "bool", typeId: KIWI_TYPE.BOOL, isArray: false, value: 48 },

          // AutoLayout fields - child level (50-59)
          { name: "stackPositioning", type: "StackPositioning", typeId: 22, isArray: false, value: 50 },
          { name: "stackPrimarySizing", type: "StackSizing", typeId: 23, isArray: false, value: 51 },
          { name: "stackCounterSizing", type: "StackSizing", typeId: 23, isArray: false, value: 52 },
          { name: "horizontalConstraint", type: "ConstraintType", typeId: 24, isArray: false, value: 53 },
          { name: "verticalConstraint", type: "ConstraintType", typeId: 24, isArray: false, value: 54 },

          // Symbol/Instance fields (60-69)
          { name: "symbolID", type: "GUID", typeId: 4, isArray: false, value: 60 },
          { name: "componentPropertyReferences", type: "string", typeId: KIWI_TYPE.STRING, isArray: true, value: 61 },
        ],
      },

      // 27: Message (root type)
      {
        name: "Message",
        kind: "MESSAGE",
        fields: [
          { name: "type", type: "MessageType", typeId: 0, isArray: false, value: 1 },
          { name: "sessionID", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 2 },
          { name: "ackID", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 3 },
          { name: "nodeChanges", type: "NodeChange", typeId: 26, isArray: true, value: 4 },
        ],
      },

      // 28: ParentIndex struct
      createStructDef("ParentIndex", [
        { name: "guid", type: "GUID", typeId: 4 },
        { name: "position", type: "string", typeId: KIWI_TYPE.STRING },
      ]),
    ],
  };
}

// =============================================================================
// Type Indices (for reference)
// =============================================================================

export const TEXT_SCHEMA_INDICES = {
  MessageType: 0,
  NodeType: 1,
  NodePhase: 2,
  BlendMode: 3,
  GUID: 4,
  Vector: 5,
  Matrix: 6,
  Color: 7,
  TextAlignHorizontal: 8,
  TextAlignVertical: 9,
  TextAutoResize: 10,
  TextDecoration: 11,
  TextCase: 12,
  NumberUnits: 13,
  ValueWithUnits: 14,
  FontName: 15,
  Paint: 16,
  PaintType: 17,
  StrokeAlign: 18,
  TextData: 19,
  StackMode: 20,
  StackAlign: 21,
  StackPositioning: 22,
  StackSizing: 23,
  ConstraintType: 24,
  StackPadding: 25,
  NodeChange: 26,
  Message: 27,
  ParentIndex: 28,
} as const;
