/**
 * @file View properties types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.2.2 - View Properties
 */

// =============================================================================
// View Scale Types
// =============================================================================

/**
 * View scale ratio.
 * @see ECMA-376 Part 1, Section 19.2.2.13 (scale)
 */
export type ViewScaleRatio = {
  readonly n: number;
  readonly d: number;
  readonly value: number;
};

/**
 * View scale.
 * @see ECMA-376 Part 1, Section 19.2.2.13 (scale)
 */
export type ViewScale = {
  readonly x: ViewScaleRatio;
  readonly y: ViewScaleRatio;
};

/**
 * View origin.
 * @see ECMA-376 Part 1, Section 19.2.2.9 (origin)
 */
export type ViewOrigin = {
  readonly x: number;
  readonly y: number;
};

/**
 * Common view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.2 (cViewPr)
 */
export type CommonViewProperties = {
  readonly varScale?: boolean;
  readonly scale?: ViewScale;
  readonly origin?: ViewOrigin;
};

// =============================================================================
// Guide Types
// =============================================================================

/**
 * Direction (horizontal/vertical).
 * @see ECMA-376 Part 1, Section 19.7.2 (ST_Direction)
 */
export type Direction = "horz" | "vert";

/**
 * Guide definition.
 * @see ECMA-376 Part 1, Section 19.2.2.4 (guide)
 */
export type Guide = {
  readonly orient?: Direction;
  readonly pos?: number;
};

/**
 * Guide list.
 * @see ECMA-376 Part 1, Section 19.2.2.5 (guideLst)
 */
export type GuideList = {
  readonly guides: Guide[];
};

// =============================================================================
// Slide View Types
// =============================================================================

/**
 * Common slide view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.1 (cSldViewPr)
 */
export type CommonSlideViewProperties = {
  readonly showGuides?: boolean;
  readonly snapToGrid?: boolean;
  readonly snapToObjects?: boolean;
  readonly commonView?: CommonViewProperties;
  readonly guideList?: GuideList;
};

/**
 * Normal view portion.
 * @see ECMA-376 Part 1, Section 19.2.2.11/12 (restoredLeft/restoredTop)
 */
export type NormalViewPortion = {
  readonly autoAdjust?: boolean;
  readonly size?: number;
};

/**
 * Splitter bar state.
 * @see ECMA-376 Part 1, Section 19.7.19 (ST_SplitterBarState)
 */
export type SplitterBarState = "maximized" | "minimized" | "restored";

/**
 * Normal view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.6 (normalViewPr)
 */
export type NormalViewProperties = {
  readonly horzBarState?: SplitterBarState;
  readonly vertBarState?: SplitterBarState;
  readonly preferSingleView?: boolean;
  readonly showOutlineIcons?: boolean;
  readonly snapVertSplitter?: boolean;
  readonly restoredLeft?: NormalViewPortion;
  readonly restoredTop?: NormalViewPortion;
};

// =============================================================================
// Outline View Types
// =============================================================================

/**
 * Outline view slide entry.
 * @see ECMA-376 Part 1, Section 19.2.2.14 (sld)
 */
export type OutlineViewSlide = {
  readonly rId: string;
  readonly collapse?: boolean;
};

/**
 * Outline view slide list.
 * @see ECMA-376 Part 1, Section 19.2.2.15 (sldLst)
 */
export type OutlineViewSlideList = {
  readonly slides: OutlineViewSlide[];
};

/**
 * Outline view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.10 (outlineViewPr)
 */
export type OutlineViewProperties = {
  readonly commonView?: CommonViewProperties;
  readonly slideList?: OutlineViewSlideList;
};

// =============================================================================
// Notes View Types
// =============================================================================

/**
 * Notes text view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.7 (notesTextViewPr)
 */
export type NotesTextViewProperties = {
  readonly commonView?: CommonViewProperties;
};

/**
 * Notes view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.8 (notesViewPr)
 */
export type NotesViewProperties = {
  readonly commonView?: CommonViewProperties;
};

// =============================================================================
// Slide View Properties
// =============================================================================

/**
 * Slide view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.16 (slideViewPr)
 */
export type SlideViewProperties = {
  readonly commonSlideView?: CommonSlideViewProperties;
};

/**
 * Slide sorter view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.17 (sorterViewPr)
 */
export type SorterViewProperties = {
  readonly commonView?: CommonViewProperties;
  readonly showFormatting?: boolean;
};

/**
 * Grid spacing.
 * @see ECMA-376 Part 1, Section 19.2.2.3 (gridSpacing)
 */
export type GridSpacing = {
  readonly cx?: number;
  readonly cy?: number;
};

// =============================================================================
// View Properties Container
// =============================================================================

/**
 * View types.
 * @see ECMA-376 Part 1, Section 19.7.55 (ST_ViewType)
 */
export type ViewType =
  | "handoutView"
  | "notesMasterView"
  | "notesView"
  | "outlineView"
  | "sldMasterView"
  | "sldSorterView"
  | "sldThumbnailView"
  | "sldView";

/**
 * View properties.
 * @see ECMA-376 Part 1, Section 19.2.2.18 (viewPr)
 */
export type ViewProperties = {
  readonly lastView?: ViewType;
  readonly showComments?: boolean;
  readonly normalView?: NormalViewProperties;
  readonly slideView?: SlideViewProperties;
  readonly outlineView?: OutlineViewProperties;
  readonly notesTextView?: NotesTextViewProperties;
  readonly notesView?: NotesViewProperties;
  readonly sorterView?: SorterViewProperties;
  readonly gridSpacing?: GridSpacing;
};
