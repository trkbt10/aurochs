/**
 * @file Slide domain types for PPTX processing
 *
 * Pure domain types for slide resources.
 * No render layer dependencies.
 *
 * @see ECMA-376 Part 1, Section 19.3 - Presentation ML
 */

import type { XmlElement } from "../../../xml";
import type { Fill } from "../color/types";
import type { ColorMapping, ColorMapOverride } from "../color/types";
import type { ColorMap } from "../resolution";
import type { Shape } from "../shape";
import type { Pixels, ResourceId, ShapeId } from "../types";
import type { SlideTransition } from "../transition";
import type { MasterTextStyles, TextStyleLevels } from "../text-style";
import type { CustomerData } from "../metadata";
import type { ResourceMap, PlaceholderTable } from "../opc";
import type { RawMasterTextStyles } from "../theme";

// =============================================================================
// Slide Size Types
// =============================================================================

/**
 * Slide dimensions
 * @see ECMA-376 Part 1, Section 19.2.1.34 (sldSz)
 */
export type SlideSize = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly type?: SlideSizeType;
};

/**
 * Predefined slide size type
 * @see ECMA-376 Part 1, Section 19.7.24 (ST_SlideSizeType)
 */
export type SlideSizeType =
  | "screen4x3"
  | "letter"
  | "A4"
  | "35mm"
  | "overhead"
  | "banner"
  | "custom"
  | "ledger"
  | "A3"
  | "B4ISO"
  | "B5ISO"
  | "B4JIS"
  | "B5JIS"
  | "hagakiCard"
  | "screen16x9"
  | "screen16x10";

// =============================================================================
// Background Types
// =============================================================================

/**
 * Background properties
 * @see ECMA-376 Part 1, Section 19.3.1.1 (bg)
 */
export type Background = {
  readonly fill: Fill;
  readonly shadeToTitle?: boolean;
};

// =============================================================================
// Timing Types (Slide-specific, to be integrated with animation.ts)
// =============================================================================

/**
 * Timing information
 * @see ECMA-376 Part 1, Section 19.5.87 (timing)
 */
export type SlideTiming = {
  readonly buildList?: readonly BuildEntry[];
  readonly sequences?: readonly AnimationSequence[];
};

/**
 * Build entry for incremental animations
 */
export type BuildEntry = {
  readonly shapeId: ShapeId;
  readonly groupId?: number;
  readonly order?: number;
};

/**
 * Animation sequence
 */
export type AnimationSequence = {
  readonly concurrent?: boolean;
  readonly prevAction?: "none" | "skip";
  readonly nextAction?: "none" | "seek";
  readonly animations: readonly Animation[];
};

/**
 * Animation definition
 */
export type Animation = {
  readonly shapeId: ShapeId;
  readonly preset: string;
  readonly duration: number;
  readonly delay?: number;
};

// =============================================================================
// Slide Types
// =============================================================================

/**
 * Complete slide definition
 * @see ECMA-376 Part 1, Section 19.3.1.38 (sld)
 */
export type Slide = {
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMapOverride?: ColorMapOverride;
  readonly customerData?: readonly CustomerData[];
  readonly transition?: SlideTransition;
  readonly timing?: SlideTiming;
  readonly showMasterShapes?: boolean;
  readonly showMasterPhAnim?: boolean;
};

/**
 * Slide layout definition
 * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
 */
export type SlideLayout = {
  readonly type: SlideLayoutType;
  readonly name?: string;
  readonly matchingName?: string;
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMapOverride?: ColorMapOverride;
  readonly customerData?: readonly CustomerData[];
  readonly transition?: SlideTransition;
  readonly timing?: SlideTiming;
  readonly showMasterShapes?: boolean;
  readonly showMasterPhAnim?: boolean;
  readonly preserve?: boolean;
  readonly userDrawn?: boolean;
};

/**
 * Slide layout type
 * @see ECMA-376 Part 1, Section 19.7.15 (ST_SlideLayoutType)
 */
export type SlideLayoutType =
  | "title"
  | "tx"
  | "twoColTx"
  | "tbl"
  | "txAndChart"
  | "chartAndTx"
  | "dgm"
  | "chart"
  | "txAndClipArt"
  | "clipArtAndTx"
  | "titleOnly"
  | "blank"
  | "txAndObj"
  | "objAndTx"
  | "objOnly"
  | "obj"
  | "txAndMedia"
  | "mediaAndTx"
  | "objOverTx"
  | "txOverObj"
  | "txAndTwoObj"
  | "twoObjAndTx"
  | "twoObjOverTx"
  | "fourObj"
  | "vertTx"
  | "clipArtAndVertTx"
  | "vertTitleAndTx"
  | "vertTitleAndTxOverChart"
  | "twoObj"
  | "objAndTwoObj"
  | "twoObjAndObj"
  | "cust"
  | "secHead"
  | "twoTxTwoObj"
  | "objTx"
  | "picTx";

/**
 * Slide layout ID entry.
 * @see ECMA-376 Part 1, Section 19.3.1.40 (sldLayoutId)
 */
export type SlideLayoutId = {
  readonly id: number;
  readonly rId: ResourceId;
};

/**
 * Slide master definition
 * @see ECMA-376 Part 1, Section 19.3.1.41 (sldMaster)
 */
export type SlideMaster = {
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMap: ColorMapping;
  readonly slideLayoutIds?: readonly SlideLayoutId[];
  readonly customerData?: readonly CustomerData[];
  readonly textStyles?: MasterTextStyles;
  readonly timing?: SlideTiming;
  readonly transition?: SlideTransition;
  readonly preserve?: boolean;
};

/**
 * Handout master definition
 * @see ECMA-376 Part 1, Section 19.3.1.24 (handoutMaster)
 */
export type HandoutMaster = {
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMap: ColorMapping;
  readonly customerData?: readonly CustomerData[];
  readonly preserve?: boolean;
};

/**
 * Notes master definition
 * @see ECMA-376 Part 1, Section 19.3.1.27 (notesMaster)
 */
export type NotesMaster = {
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMap: ColorMapping;
  readonly customerData?: readonly CustomerData[];
  readonly notesStyle?: TextStyleLevels;
  readonly preserve?: boolean;
};

// =============================================================================
// Slide Params Types (Pure data, no render dependencies)
// =============================================================================

/**
 * Slide master parameters for rendering.
 * Contains resolved data from slide master XML.
 */
export type SlideMasterParams = {
  readonly textStyles: RawMasterTextStyles;
  readonly placeholders: PlaceholderTable;
  readonly colorMap: ColorMap;
  readonly resources: ResourceMap;
  /** Master content element (p:sldMaster) for background lookup */
  readonly content?: XmlElement;
};

/**
 * Slide layout parameters for rendering.
 * Contains resolved data from slide layout XML.
 */
export type SlideLayoutParams = {
  readonly placeholders: PlaceholderTable;
  readonly resources: ResourceMap;
  /** Layout content element (p:sldLayout) for background lookup */
  readonly content?: XmlElement;
};

/**
 * Slide parameters for rendering.
 * Contains resolved data from slide XML.
 */
export type SlideParams = {
  readonly content: XmlElement;
  readonly resources: ResourceMap;
  readonly colorMapOverride?: ColorMap;
};
