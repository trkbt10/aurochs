/**
 * @file Story registry
 *
 * Add new component stories here to include them in the preview.
 */

import type { Category } from "../types";

// Primitives
import { ButtonStories } from "./Button.stories";
import { InputStories } from "./Input.stories";
import { ToggleStories } from "./Toggle.stories";
import { SliderStories } from "./Slider.stories";
import { TabsStories } from "./Tabs.stories";
import { IconButtonStories } from "./IconButton.stories";

// Player
import { PlayerStories } from "./Player.stories";

// Viewer
import { NavigationControlsStories } from "./NavigationControls.stories";

/**
 * All component categories and their stories.
 */
export const catalog: readonly Category[] = [
  {
    name: "Primitives",
    components: [
      ButtonStories,
      IconButtonStories,
      InputStories,
      SliderStories,
      TabsStories,
      ToggleStories,
    ],
  },
  {
    name: "Player",
    components: [PlayerStories],
  },
  {
    name: "Viewer",
    components: [NavigationControlsStories],
  },
];
