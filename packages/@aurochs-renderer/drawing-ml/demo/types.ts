/**
 * @file DrawingML Demo Types
 *
 * Shared types for DrawingML demo components.
 */

import type { ComponentType } from "react";

export type CheckItem = {
  readonly label: string;
  readonly status: "pass" | "partial" | "pending";
  readonly notes?: string;
};

export type Category = "core" | "svg" | "webgl";

export type FeatureRoute = {
  readonly id: string;
  readonly label: string;
  readonly component: ComponentType;
};

export type CategoryRoute = {
  readonly id: Category;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly features: readonly FeatureRoute[];
};
