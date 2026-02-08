/**
 * @file Symbol and Instance node type definitions
 */

import type { Paint, StackPadding } from "../types";
import type {
  StackMode,
  StackAlign,
  StackPositioning,
  StackSizing,
  ConstraintType,
} from "../../constants";
import type { ExportSettings } from "../frame";

export type SymbolNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly size: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly fillPaints: readonly Paint[];
  readonly visible: boolean;
  readonly opacity: number;
  readonly clipsContent: boolean;
  readonly cornerRadius?: number;
  readonly exportSettings?: readonly ExportSettings[];

  // AutoLayout - frame level (symbols support auto-layout)
  readonly stackMode?: { value: number; name: StackMode };
  readonly stackSpacing?: number;
  readonly stackPadding?: StackPadding;
  readonly stackPrimaryAlignItems?: { value: number; name: StackAlign };
  readonly stackCounterAlignItems?: { value: number; name: StackAlign };
  readonly stackPrimaryAlignContent?: { value: number; name: StackAlign };
  readonly stackWrap?: boolean;
  readonly stackCounterSpacing?: number;
  readonly itemReverseZIndex?: boolean;
};

export type InstanceNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly symbolID: { sessionID: number; localID: number };
  readonly size: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly visible: boolean;
  readonly opacity: number;

  // Override properties
  readonly fillPaints?: readonly Paint[];
  readonly overriddenSymbolID?: { sessionID: number; localID: number };
  readonly componentPropertyReferences?: readonly string[];

  // Child constraint properties (when inside auto-layout parent)
  readonly stackPositioning?: { value: number; name: StackPositioning };
  readonly stackPrimarySizing?: { value: number; name: StackSizing };
  readonly stackCounterSizing?: { value: number; name: StackSizing };
  readonly horizontalConstraint?: { value: number; name: ConstraintType };
  readonly verticalConstraint?: { value: number; name: ConstraintType };
};
