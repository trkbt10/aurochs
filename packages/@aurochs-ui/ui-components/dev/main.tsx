import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "../src/design-tokens";
import { App } from "../src/dev/App";

injectCSSVariables();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
