/**
 * @file Diagram (SmartArt) domain types
 *
 * Domain objects for DiagramML definitions (data model, layout, style, colors).
 * These are parsed from diagram parts (data1.xml, layout1.xml, quickStyle1.xml,
 * colors1.xml) and are renderer-agnostic.
 */

import type { Percent } from "@oxen-office/ooxml/domain/units";
import type { Color } from "@oxen-office/ooxml/domain/color";

type PresetShapeType = string;

// =============================================================================
// Common Types
// =============================================================================

export type DiagramCategory = {
  readonly type?: string;
  readonly priority?: number;
};

export type DiagramVariable = {
  readonly name: string;
  readonly value?: string;
};

export type DiagramAnimLvlStr = "ctr" | "lvl" | "none";

export type DiagramAnimOneStr = "branch" | "none" | "one";

export type DiagramArrowheadStyle = "auto" | "arr" | "noArr";

export type DiagramAutoTextRotation = "grav" | "none" | "upr";

export type DiagramAxisType =
  | "ancst"
  | "ancstOrSelf"
  | "ch"
  | "des"
  | "desOrSelf"
  | "follow"
  | "followSib"
  | "none"
  | "par"
  | "preced"
  | "precedSib"
  | "root"
  | "self";

export type DiagramAxisTypes = readonly DiagramAxisType[];

export type DiagramBendPoint = "beg" | "def" | "end";

export type DiagramBooleans = readonly boolean[];

export type DiagramBoolOperator = "equ" | "gte" | "lte" | "none";

export type DiagramBreakpoint = "bal" | "endCnv" | "fixed";

export type DiagramCenterShapeMapping = "fNode" | "none";

export type DiagramChildAlignment = "b" | "l" | "r" | "t";

export type DiagramChildDirection = "horz" | "vert";

export type DiagramChildOrderType = "b" | "t";

export type DiagramClrAppMethod = "cycle" | "repeat" | "span";

export type DiagramConnectorDimension = "1D" | "2D" | "cust";

export type DiagramConnectorPoint =
  | "auto"
  | "bCtr"
  | "bL"
  | "bR"
  | "ctr"
  | "midL"
  | "midR"
  | "radial"
  | "tCtr"
  | "tL"
  | "tR";

export type DiagramConnectorRouting = "bend" | "curve" | "longCurve" | "stra";

export type DiagramConstraintRelationship = "ch" | "des" | "self";

export type DiagramConstraintType =
  | "alignOff"
  | "b"
  | "begMarg"
  | "begPad"
  | "bendDist"
  | "bMarg"
  | "bOff"
  | "connDist"
  | "ctrX"
  | "ctrXOff"
  | "ctrY"
  | "ctrYOff"
  | "diam"
  | "endMarg"
  | "endPad"
  | "h"
  | "hArH"
  | "hOff"
  | "l"
  | "lMarg"
  | "lOff"
  | "none"
  | "primFontSz"
  | "pyraAcctRatio"
  | "r"
  | "rMarg"
  | "rOff"
  | "secFontSz"
  | "secSibSp"
  | "sibSp"
  | "sp"
  | "stemThick"
  | "t"
  | "tMarg"
  | "tOff"
  | "userA"
  | "userB"
  | "userC"
  | "userD"
  | "userE"
  | "userF"
  | "userG"
  | "userH"
  | "userI"
  | "userJ"
  | "userK"
  | "userL"
  | "userM"
  | "userN"
  | "userO"
  | "userP"
  | "userQ"
  | "userR"
  | "userS"
  | "userT"
  | "userU"
  | "userV"
  | "userW"
  | "userX"
  | "userY"
  | "userZ"
  | "w"
  | "wArH"
  | "wOff";

export type DiagramContinueDirection = "revDir" | "sameDir";

export type DiagramCxnType = "parOf" | "presOf" | "presParOf" | "unknownRelationship";

export type DiagramHorizontalAlignment = "ctr" | "l" | "none" | "r";

export type DiagramNodeHorizontalAlignment = "ctr" | "l" | "r";

export type DiagramNodeVerticalAlignment = "b" | "mid" | "t";

export type DiagramOffset = "ctr" | "off";

export type DiagramTextAlignment = "ctr" | "l" | "r";

export type DiagramDirection = "norm" | "rev";

export type DiagramElementType =
  | "all"
  | "asst"
  | "doc"
  | "node"
  | "nonAsst"
  | "nonNorm"
  | "norm"
  | "parTrans"
  | "pres"
  | "sibTrans";

export type DiagramElementTypes = readonly DiagramElementType[];

export type DiagramFallbackDimension = "1D" | "2D";

export type DiagramFlowDirection = "col" | "row";

export type DiagramLinearDirection = "fromB" | "fromL" | "fromR" | "fromT";

export type DiagramVariableType =
  | "animLvl"
  | "animOne"
  | "bulEnabled"
  | "chMax"
  | "chPref"
  | "dir"
  | "hierBranch"
  | "none"
  | "orgChart"
  | "resizeHandles";

export type DiagramFunctionArgument = DiagramVariableType;

export type DiagramFunctionOperator = "equ" | "gt" | "gte" | "lt" | "lte" | "neq";

export type DiagramFunctionType =
  | "cnt"
  | "depth"
  | "maxDepth"
  | "pos"
  | "posEven"
  | "posOdd"
  | "revPos"
  | "var";

export type DiagramHierBranchStyle = "hang" | "init" | "l" | "r" | "std";

export type DiagramResizeHandlesStr = "exact" | "rel";

export type DiagramFunctionValue =
  | DiagramAnimLvlStr
  | DiagramAnimOneStr
  | DiagramDirection
  | DiagramHierBranchStyle
  | DiagramResizeHandlesStr
  | boolean
  | number;

export type DiagramGrowDirection = "bL" | "bR" | "tL" | "tR";

export type DiagramHierarchyAlignment =
  | "bCtrCh"
  | "bCtrDes"
  | "bL"
  | "bR"
  | "lB"
  | "lCtrCh"
  | "lCtrDes"
  | "lT"
  | "rB"
  | "rCtrCh"
  | "rCtrDes"
  | "rT"
  | "tCtrCh"
  | "tCtrDes"
  | "tL"
  | "tR";

export type DiagramHueDir = "ccw" | "cw";

export type DiagramIndex1 = number;

export type DiagramInts = readonly number[];

export type DiagramModelId = string;

export type DiagramNodeCount = number;

export type DiagramUnsignedInts = readonly number[];

export type DiagramVariableList = {
  readonly variables: readonly DiagramVariable[];
};

export type DiagramExtension = {
  readonly uri?: string;
  readonly dataModelExt?: DiagramDataModelExtension;
};

export type DiagramDataModelExtension = {
  readonly relId?: string;
  readonly minVersion?: string;
};

// =============================================================================
// Data Model
// =============================================================================

export type DiagramDataModel = {
  readonly points: readonly DiagramPoint[];
  readonly connections: readonly DiagramConnection[];
  readonly background?: DiagramBackground;
  readonly whole?: DiagramWhole;
  readonly extensions?: readonly DiagramExtension[];
};

export type DiagramPoint = {
  readonly modelId: DiagramModelId;
  readonly type?: string;
  readonly connectionId?: string;
  readonly propertySet?: DiagramPropertySet;
  /** Format-specific shape properties (e.g. DrawingML spPr). */
  readonly shapeProperties?: unknown;
  /** Format-specific rich text body (e.g. DrawingML a:txBody). */
  readonly textBody?: unknown;
  readonly extensions?: readonly DiagramExtension[];
};

export type DiagramConnection = {
  readonly modelId: DiagramModelId;
  readonly type?: DiagramCxnType;
  readonly sourceId?: string;
  readonly destinationId?: string;
  readonly sourceOrder?: number;
  readonly destinationOrder?: number;
  readonly parentTransitionId?: string;
  readonly siblingTransitionId?: string;
  readonly presentationId?: string;
};

export type DiagramBackground = {
  readonly present: true;
};

export type DiagramWhole = {
  readonly present: true;
};

export type DiagramPropertySet = {
  readonly layoutTypeId?: string;
  readonly layoutCategoryId?: string;
  readonly quickStyleTypeId?: string;
  readonly quickStyleCategoryId?: string;
  readonly colorTypeId?: string;
  readonly colorCategoryId?: string;
  readonly coherent3DOff?: boolean;
  readonly customAngle?: number;
  readonly customFlipHorizontal?: boolean;
  readonly customFlipVertical?: boolean;
  readonly customSizeX?: number;
  readonly customSizeY?: number;
  readonly customScaleX?: DiagramPrSetCustVal;
  readonly customScaleY?: DiagramPrSetCustVal;
  readonly customText?: boolean;
  readonly customLinearFactorX?: DiagramPrSetCustVal;
  readonly customLinearFactorY?: DiagramPrSetCustVal;
  readonly customLinearFactorNeighborX?: DiagramPrSetCustVal;
  readonly customLinearFactorNeighborY?: DiagramPrSetCustVal;
  readonly customRadiusScale?: DiagramPrSetCustVal;
  readonly customRadiusScaleInclude?: DiagramPrSetCustVal;
  readonly placeholder?: boolean;
  readonly placeholderText?: string;
  readonly presentationAssocId?: string;
  readonly presentationName?: string;
  readonly presentationStyleLabel?: string;
  readonly presentationStyleIndex?: number;
  readonly presentationStyleCount?: number;
  readonly presentationLayoutVars?: DiagramVariableList;
};

// =============================================================================
// Layout Definition
// =============================================================================

export type DiagramLayoutDefinition = {
  readonly uniqueId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly categories?: readonly DiagramCategory[];
  readonly sampleData?: DiagramDataModel;
  readonly styleData?: DiagramDataModel;
  readonly colorData?: DiagramDataModel;
  readonly layoutNode?: DiagramLayoutNode;
};

export type DiagramLayoutDefinitionHeader = {
  readonly uniqueId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly categories?: readonly DiagramCategory[];
  readonly defaultStyle?: string;
  readonly minimumVersion?: string;
  readonly resourceId?: number;
};

export type DiagramLayoutDefinitionHeaderList = {
  readonly headers: readonly DiagramLayoutDefinitionHeader[];
};

export type DiagramLayoutNode = DiagramLayoutContent & {
  readonly name?: string;
  readonly childOrder?: DiagramChildOrderType;
  readonly moveWith?: string;
  readonly styleLabel?: string;
};

export type DiagramLayoutContent = {
  readonly variables?: DiagramVariableList;
  readonly algorithm?: DiagramAlgorithm;
  readonly shape?: DiagramLayoutShape;
  readonly presentationOf?: DiagramPresentationOf;
  readonly constraints?: readonly DiagramConstraint[];
  readonly rules?: readonly DiagramRule[];
  readonly forEach?: readonly DiagramForEach[];
  readonly choose?: readonly DiagramChoose[];
  readonly children?: readonly DiagramLayoutNode[];
};

export type DiagramAlgorithmType =
  | "composite"
  | "conn"
  | "cycle"
  | "hierChild"
  | "hierRoot"
  | "lin"
  | "pyra"
  | "snake"
  | "sp"
  | "tx";

export type DiagramAlgorithm = {
  readonly type?: DiagramAlgorithmType;
  readonly params?: readonly DiagramAlgorithmParam[];
};

export type DiagramAlgorithmParam = {
  readonly type?: DiagramParameterId;
  readonly value?: DiagramParameterValue;
};

export type DiagramOutputShapeType = "conn" | "none";

export type DiagramLayoutShapeType = PresetShapeType | DiagramOutputShapeType;

export type DiagramLayoutShape = {
  readonly type?: DiagramLayoutShapeType;
  readonly blipId?: string;
  readonly adjustments?: readonly DiagramAdjust[];
};

export type DiagramAdjust = {
  readonly index?: DiagramIndex1;
  readonly value?: string;
};

export type DiagramParameterId =
  | "alignTx"
  | "ar"
  | "autoTxRot"
  | "begPts"
  | "begSty"
  | "bendPt"
  | "bkpt"
  | "bkPtFixedVal"
  | "chAlign"
  | "chDir"
  | "connRout"
  | "contDir"
  | "ctrShpMap"
  | "dim"
  | "dstNode"
  | "endPts"
  | "endSty"
  | "fallback"
  | "flowDir"
  | "grDir"
  | "hierAlign"
  | "horzAlign"
  | "linDir"
  | "lnSpAfChP"
  | "lnSpAfParP"
  | "lnSpCh"
  | "lnSpPar"
  | "nodeHorzAlign"
  | "nodeVertAlign"
  | "off"
  | "parTxLTRAlign"
  | "parTxRTLAlign"
  | "pyraAcctBkgdNode"
  | "pyraAcctPos"
  | "pyraAcctTxMar"
  | "pyraAcctTxNode"
  | "pyraLvlNode"
  | "rotPath"
  | "rtShortDist"
  | "secChAlign"
  | "secLinDir"
  | "shpTxLTRAlignCh"
  | "shpTxRTLAlignCh"
  | "spanAng"
  | "srcNode"
  | "stAng"
  | "stBulletLvl"
  | "stElem"
  | "txAnchorHorz"
  | "txAnchorHorzCh"
  | "txAnchorVert"
  | "txAnchorVertCh"
  | "txBlDir"
  | "txDir"
  | "vertAlign";

export type DiagramParameterValue =
  | DiagramArrowheadStyle
  | DiagramAutoTextRotation
  | DiagramBendPoint
  | DiagramBreakpoint
  | DiagramCenterShapeMapping
  | DiagramChildAlignment
  | DiagramChildDirection
  | DiagramConnectorDimension
  | DiagramConnectorPoint
  | DiagramConnectorRouting
  | DiagramContinueDirection
  | DiagramHorizontalAlignment
  | DiagramTextAlignment
  | DiagramFallbackDimension
  | DiagramFlowDirection
  | DiagramGrowDirection
  | DiagramHierarchyAlignment
  | DiagramLinearDirection
  | DiagramNodeHorizontalAlignment
  | DiagramNodeVerticalAlignment
  | DiagramOffset
  | DiagramPyramidAccentPosition
  | DiagramPyramidAccentTextMargin
  | DiagramRotationPath
  | DiagramSecondaryChildAlignment
  | DiagramSecondaryLinearDirection
  | DiagramStartingElement
  | DiagramTextAnchorHorizontal
  | DiagramTextAnchorVertical
  | DiagramTextBlockDirection
  | DiagramTextDirection
  | DiagramVerticalAlignment
  | boolean
  | number
  | string;

export type DiagramPyramidAccentPosition = "aft" | "bef";

export type DiagramPyramidAccentTextMargin = "stack" | "step";

export type DiagramRotationPath = "alongPath" | "none";

export type DiagramSecondaryChildAlignment = "b" | "l" | "none" | "r" | "t";

export type DiagramSecondaryLinearDirection =
  | "fromB"
  | "fromL"
  | "fromR"
  | "fromT"
  | "none";

export type DiagramStartingElement = "node" | "trans";

export type DiagramTextAnchorHorizontal = "ctr" | "none";

export type DiagramTextAnchorVertical = "b" | "mid" | "t";

export type DiagramTextBlockDirection = "horz" | "vert";

export type DiagramTextDirection = "fromB" | "fromT";

export type DiagramVerticalAlignment = "b" | "mid" | "none" | "t";

export type DiagramPrSetCustVal = Percent;

export type DiagramPresentationOf = {
  readonly axis?: DiagramAxisTypes;
  readonly pointType?: DiagramElementTypes;
  readonly count?: DiagramUnsignedInts;
  readonly hideLastTransition?: DiagramBooleans;
  readonly start?: DiagramInts;
  readonly step?: DiagramInts;
};

export type DiagramConstraint = {
  readonly type?: DiagramConstraintType;
  readonly forRelationship?: DiagramConstraintRelationship;
  readonly forName?: string;
  readonly referenceType?: DiagramConstraintType;
  readonly referenceForRelationship?: DiagramConstraintRelationship;
  readonly referenceForName?: string;
  readonly operator?: DiagramBoolOperator;
  readonly value?: string;
  readonly factor?: string;
  readonly max?: string;
  readonly min?: string;
};

export type DiagramRule = {
  readonly type?: string;
  readonly value?: string;
  readonly factor?: string;
  readonly max?: string;
  readonly min?: string;
};

export type DiagramForEach = {
  readonly name?: string;
  readonly axis?: DiagramAxisTypes;
  readonly pointType?: DiagramElementTypes;
  readonly count?: DiagramUnsignedInts;
  readonly hideLastTransition?: DiagramBooleans;
  readonly start?: DiagramInts;
  readonly step?: DiagramInts;
  readonly content: DiagramLayoutContent;
};

export type DiagramChoose = {
  readonly name?: string;
  readonly if?: DiagramIf;
  readonly else?: DiagramElse;
};

export type DiagramIf = DiagramLayoutContent & {
  readonly name?: string;
  readonly function?: DiagramFunctionType;
  readonly argument?: DiagramFunctionArgument;
  readonly operator?: DiagramFunctionOperator;
  readonly value?: DiagramFunctionValue;
};

export type DiagramElse = DiagramLayoutContent & {
  readonly name?: string;
};

// =============================================================================
// Style Definition
// =============================================================================

export type DiagramStyleDefinition = {
  readonly uniqueId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly categories?: readonly DiagramCategory[];
  /** Format-specific 3D scene settings. */
  readonly scene3d?: unknown;
  readonly styleLabels?: readonly DiagramStyleLabel[];
};

export type DiagramStyleDefinitionHeader = {
  readonly uniqueId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly categories?: readonly DiagramCategory[];
  readonly minimumVersion?: string;
  readonly resourceId?: number;
};

export type DiagramStyleDefinitionHeaderList = {
  readonly headers: readonly DiagramStyleDefinitionHeader[];
};

export type DiagramStyleLabel = {
  readonly name?: string;
  /** Format-specific 3D scene settings. */
  readonly scene3d?: unknown;
  /** Format-specific 3D shape settings. */
  readonly shape3d?: unknown;
  /** Format-specific rich text properties. */
  readonly textProperties?: unknown;
  /** Format-specific shape style reference. */
  readonly style?: unknown;
};

// =============================================================================
// Color Definition
// =============================================================================

export type DiagramColorsDefinition = {
  readonly uniqueId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly categories?: readonly DiagramCategory[];
  readonly styleLabels?: readonly DiagramColorStyleLabel[];
};

export type DiagramColorsDefinitionHeader = {
  readonly uniqueId?: string;
  readonly title?: string;
  readonly description?: string;
  readonly categories?: readonly DiagramCategory[];
  readonly minimumVersion?: string;
  readonly resourceId?: number;
};

export type DiagramColorsDefinitionHeaderList = {
  readonly headers: readonly DiagramColorsDefinitionHeader[];
};

export type DiagramColorStyleLabel = {
  readonly name?: string;
  readonly fillColors?: DiagramColorList;
  readonly lineColors?: DiagramColorList;
  readonly effectColors?: DiagramColorList;
  readonly textLineColors?: DiagramColorList;
  readonly textFillColors?: DiagramColorList;
  readonly textEffectColors?: DiagramColorList;
};

export type DiagramColorList = {
  readonly method?: DiagramClrAppMethod;
  readonly hueDirection?: DiagramHueDir;
  readonly colors: readonly Color[];
};
