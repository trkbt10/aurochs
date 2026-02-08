/**
 * @file Common type definitions shared across builders
 */

import type { NumberUnits } from "../../constants";

export type StackPadding = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
};

export type ValueWithUnits = {
  readonly value: number;
  readonly units: { value: number; name: NumberUnits };
};

export type FontName = {
  readonly family: string;
  readonly style: string;
  readonly postscript: string;
};
