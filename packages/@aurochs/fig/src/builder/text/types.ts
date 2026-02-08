/**
 * @file Text node type definitions
 */

import type { Paint, ValueWithUnits, FontName } from "../types";
import type {
  TextAlignHorizontal,
  TextAlignVertical,
  TextAutoResize,
  TextDecoration,
  TextCase,
} from "../../constants";

export type DerivedGlyphData = {
  readonly commandsBlob: number;
  readonly position: { x: number; y: number };
  readonly styleID?: number;
  readonly fontSize: number;
  readonly firstCharacter: number;
  readonly advance: number;
};

export type DerivedBaselineData = {
  readonly position: { x: number; y: number };
  readonly width: number;
  readonly lineY: number;
  readonly lineHeight: number;
  readonly lineAscent: number;
  readonly firstCharacter: number;
  readonly endCharacter: number;
};

export type DerivedTextNodeData = {
  readonly layoutSize?: { x: number; y: number };
  readonly baselines?: readonly DerivedBaselineData[];
  readonly glyphs?: readonly DerivedGlyphData[];
};

export type TextNodeData = {
  readonly localID: number;
  readonly parentID: number;
  readonly name: string;
  readonly characters: string;
  readonly fontSize: number;
  readonly fontName: FontName;
  readonly size: { x: number; y: number };
  readonly transform: {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
  };
  readonly textAlignHorizontal?: { value: number; name: TextAlignHorizontal };
  readonly textAlignVertical?: { value: number; name: TextAlignVertical };
  readonly textAutoResize?: { value: number; name: TextAutoResize };
  readonly textDecoration?: { value: number; name: TextDecoration };
  readonly textCase?: { value: number; name: TextCase };
  readonly lineHeight?: ValueWithUnits;
  readonly letterSpacing?: ValueWithUnits;
  readonly fillPaints: readonly Paint[];
  readonly visible: boolean;
  readonly opacity: number;
  readonly derivedTextData?: DerivedTextNodeData;
};
