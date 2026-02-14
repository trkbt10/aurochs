/**
 * @file UI Components Preview Entry Point
 *
 * Storybook-like preview for @aurochs-ui/ui-components.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { App } from "./ui-components/App";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
