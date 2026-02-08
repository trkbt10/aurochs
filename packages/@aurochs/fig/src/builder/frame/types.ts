/**
 * @file Frame node and export settings type definitions
 */

import type { Paint, StackPadding } from "../types";
import type {
  StackMode,
  StackAlign,
  StackPositioning,
  StackSizing,
  ConstraintType,
  ImageType,
  ExportConstraintType,
  ExportColorProfile,
  ExportSVGIDMode,
} from "../../constants";

export type ExportSettings = {
  readonly suffix: string;
  readonly imageType: { value: number; name: ImageType };
  readonly constraint: {
    readonly type: { value: number; name: ExportConstraintType };
    readonly value: number;
  };
  readonly svgDataName: boolean;
  readonly svgIDMode: { value: number; name: ExportSVGIDMode };
  readonly svgOutlineText: boolean;
  readonly contentsOnly: boolean;
  readonly svgForceStrokeMasks: boolean;
  readonly useAbsoluteBounds: boolean;
  readonly colorProfile: { value: number; name: ExportColorProfile };
  readonly useBicubicSampler: boolean;
};

export type FrameNodeData = {
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

  // AutoLayout - frame level
  readonly stackMode?: { value: number; name: StackMode };
  readonly stackSpacing?: number;
  readonly stackPadding?: StackPadding;
  readonly stackPrimaryAlignItems?: { value: number; name: StackAlign };
  readonly stackCounterAlignItems?: { value: number; name: StackAlign };
  readonly stackPrimaryAlignContent?: { value: number; name: StackAlign };
  readonly stackWrap?: boolean;
  readonly stackCounterSpacing?: number;
  readonly itemReverseZIndex?: boolean;

  // AutoLayout - child level (constraints)
  readonly stackPositioning?: { value: number; name: StackPositioning };
  readonly stackPrimarySizing?: { value: number; name: StackSizing };
  readonly stackCounterSizing?: { value: number; name: StackSizing };
  readonly horizontalConstraint?: { value: number; name: ConstraintType };
  readonly verticalConstraint?: { value: number; name: ConstraintType };
};
