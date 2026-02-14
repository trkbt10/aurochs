/**
 * @file Story registry
 *
 * Add new component stories here.
 */

import type { Category } from "../types";
import { PlayerStories } from "./Player.stories";

/**
 * All component categories and their stories.
 * Add new components here to include them in the preview.
 */
export const catalog: readonly Category[] = [
  {
    name: "Player",
    components: [PlayerStories],
  },
  // Add more categories here:
  // {
  //   name: "Primitives",
  //   components: [ButtonStories, InputStories, ...],
  // },
  // {
  //   name: "Layout",
  //   components: [PanelStories, AccordionStories, ...],
  // },
];
