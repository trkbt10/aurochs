/**
 * @file Preset shape type mapping
 * Based on ECMA-376 Part 1: §20.1.10.56 ST_ShapeType
 */

/**
 * Map from friendly shape type names to OOXML preset geometry names
 */
export const PRESET_MAP: Record<string, string> = {
  // =========================================================================
  // Basic Shapes
  // =========================================================================
  rectangle: "rect",
  ellipse: "ellipse",
  triangle: "triangle",
  rtTriangle: "rtTriangle",
  diamond: "diamond",
  pentagon: "pentagon",
  hexagon: "hexagon",
  heptagon: "heptagon",
  octagon: "octagon",
  decagon: "decagon",
  dodecagon: "dodecagon",
  parallelogram: "parallelogram",
  trapezoid: "trapezoid",
  // Additional basic shapes
  teardrop: "teardrop",
  halfFrame: "halfFrame",
  corner: "corner",
  diagStripe: "diagStripe",
  chord: "chord",
  funnel: "funnel",
  gear6: "gear6",
  gear9: "gear9",
  pie: "pie",
  pieWedge: "pieWedge",
  blockArc: "blockArc",

  // =========================================================================
  // Rounded/Snipped Rectangles
  // =========================================================================
  roundRect: "roundRect",
  round1Rect: "round1Rect",
  round2SameRect: "round2SameRect",
  round2DiagRect: "round2DiagRect",
  snip1Rect: "snip1Rect",
  snip2SameRect: "snip2SameRect",
  snip2DiagRect: "snip2DiagRect",
  snipRoundRect: "snipRoundRect",

  // =========================================================================
  // Block Arrows
  // =========================================================================
  rightArrow: "rightArrow",
  leftArrow: "leftArrow",
  upArrow: "upArrow",
  downArrow: "downArrow",
  leftRightArrow: "leftRightArrow",
  upDownArrow: "upDownArrow",
  bentArrow: "bentArrow",
  uturnArrow: "uturnArrow",
  chevron: "chevron",
  notchedRightArrow: "notchedRightArrow",
  stripedRightArrow: "stripedRightArrow",
  // Additional block arrows
  quadArrow: "quadArrow",
  quadArrowCallout: "quadArrowCallout",
  leftRightUpArrow: "leftRightUpArrow",
  leftUpArrow: "leftUpArrow",
  bentUpArrow: "bentUpArrow",
  curvedLeftArrow: "curvedLeftArrow",
  curvedRightArrow: "curvedRightArrow",
  curvedUpArrow: "curvedUpArrow",
  curvedDownArrow: "curvedDownArrow",
  circularArrow: "circularArrow",
  swooshArrow: "swooshArrow",
  leftCircularArrow: "leftCircularArrow",
  leftRightCircularArrow: "leftRightCircularArrow",
  // Arrow callouts
  leftArrowCallout: "leftArrowCallout",
  rightArrowCallout: "rightArrowCallout",
  upArrowCallout: "upArrowCallout",
  downArrowCallout: "downArrowCallout",
  leftRightArrowCallout: "leftRightArrowCallout",
  upDownArrowCallout: "upDownArrowCallout",

  // =========================================================================
  // Stars & Banners
  // =========================================================================
  star4: "star4",
  star5: "star5",
  star6: "star6",
  star7: "star7",
  star8: "star8",
  star10: "star10",
  star12: "star12",
  star16: "star16",
  star24: "star24",
  star32: "star32",
  // Banners
  ribbon: "ribbon",
  ribbon2: "ribbon2",
  ellipseRibbon: "ellipseRibbon",
  ellipseRibbon2: "ellipseRibbon2",
  verticalScroll: "verticalScroll",
  horizontalScroll: "horizontalScroll",
  wave: "wave",
  doubleWave: "doubleWave",
  irregularSeal1: "irregularSeal1",
  irregularSeal2: "irregularSeal2",

  // =========================================================================
  // Callouts
  // =========================================================================
  wedgeRectCallout: "wedgeRectCallout",
  wedgeRoundRectCallout: "wedgeRoundRectCallout",
  wedgeEllipseCallout: "wedgeEllipseCallout",
  cloudCallout: "cloudCallout",
  // Border callouts
  borderCallout1: "borderCallout1",
  borderCallout2: "borderCallout2",
  borderCallout3: "borderCallout3",
  // Accent callouts
  accentCallout1: "accentCallout1",
  accentCallout2: "accentCallout2",
  accentCallout3: "accentCallout3",
  // Accent border callouts
  accentBorderCallout1: "accentBorderCallout1",
  accentBorderCallout2: "accentBorderCallout2",
  accentBorderCallout3: "accentBorderCallout3",
  // Callout shapes
  callout1: "callout1",
  callout2: "callout2",
  callout3: "callout3",

  // =========================================================================
  // Flowchart Shapes
  // =========================================================================
  flowChartProcess: "flowChartProcess",
  flowChartDecision: "flowChartDecision",
  flowChartTerminator: "flowChartTerminator",
  flowChartDocument: "flowChartDocument",
  flowChartData: "flowChartInputOutput",
  flowChartConnector: "flowChartConnector",
  // Additional flowchart shapes
  flowChartAlternateProcess: "flowChartAlternateProcess",
  flowChartSort: "flowChartSort",
  flowChartExtract: "flowChartExtract",
  flowChartMerge: "flowChartMerge",
  flowChartOnlineStorage: "flowChartOnlineStorage",
  flowChartMagneticTape: "flowChartMagneticTape",
  flowChartMagneticDisk: "flowChartMagneticDisk",
  flowChartMagneticDrum: "flowChartMagneticDrum",
  flowChartDisplay: "flowChartDisplay",
  flowChartDelay: "flowChartDelay",
  flowChartPreparation: "flowChartPreparation",
  flowChartManualInput: "flowChartManualInput",
  flowChartManualOperation: "flowChartManualOperation",
  flowChartPunchedCard: "flowChartPunchedCard",
  flowChartPunchedTape: "flowChartPunchedTape",
  flowChartSummingJunction: "flowChartSummingJunction",
  flowChartOr: "flowChartOr",
  flowChartCollate: "flowChartCollate",
  flowChartInternalStorage: "flowChartInternalStorage",
  flowChartMultidocument: "flowChartMultidocument",
  flowChartOffpageConnector: "flowChartOffpageConnector",
  flowChartPredefinedProcess: "flowChartPredefinedProcess",

  // =========================================================================
  // Math Shapes
  // =========================================================================
  mathPlus: "mathPlus",
  mathMinus: "mathMinus",
  mathMultiply: "mathMultiply",
  mathDivide: "mathDivide",
  mathEqual: "mathEqual",
  mathNotEqual: "mathNotEqual",

  // =========================================================================
  // Braces & Brackets
  // =========================================================================
  leftBrace: "leftBrace",
  rightBrace: "rightBrace",
  leftBracket: "leftBracket",
  rightBracket: "rightBracket",
  bracePair: "bracePair",
  bracketPair: "bracketPair",

  // =========================================================================
  // Action Buttons
  // =========================================================================
  actionButtonBackPrevious: "actionButtonBackPrevious",
  actionButtonBeginning: "actionButtonBeginning",
  actionButtonBlank: "actionButtonBlank",
  actionButtonDocument: "actionButtonDocument",
  actionButtonEnd: "actionButtonEnd",
  actionButtonForwardNext: "actionButtonForwardNext",
  actionButtonHelp: "actionButtonHelp",
  actionButtonHome: "actionButtonHome",
  actionButtonInformation: "actionButtonInformation",
  actionButtonMovie: "actionButtonMovie",
  actionButtonReturn: "actionButtonReturn",
  actionButtonSound: "actionButtonSound",

  // =========================================================================
  // Misc Shapes
  // =========================================================================
  heart: "heart",
  lightning: "lightningBolt",
  lightningBolt: "lightningBolt",
  sun: "sun",
  moon: "moon",
  cloud: "cloud",
  arc: "arc",
  donut: "donut",
  frame: "frame",
  cube: "cube",
  can: "can",
  foldedCorner: "foldedCorner",
  smileyFace: "smileyFace",
  noSmoking: "noSmoking",
  plus: "mathPlus",
  cross: "plus",
  homePlate: "homePlate",
  plaque: "plaque",
  // Additional misc shapes
  bevel: "bevel",
  rect: "rect",
  line: "line",
  bentConnector2: "bentConnector2",
  bentConnector3: "bentConnector3",
  bentConnector4: "bentConnector4",
  bentConnector5: "bentConnector5",
  curvedConnector2: "curvedConnector2",
  curvedConnector3: "curvedConnector3",
  curvedConnector4: "curvedConnector4",
  curvedConnector5: "curvedConnector5",
  straightConnector1: "straightConnector1",
  flowChartInputOutput: "flowChartInputOutput",
  plaqueTabs: "plaqueTabs",
  squareTabs: "squareTabs",
  cornerTabs: "cornerTabs",
};
