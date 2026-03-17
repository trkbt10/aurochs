/**
 * @file Main entry for the pages demo app.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { EditorConfigProvider } from "@aurochs-ui/pptx-editor";
import { App } from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <EditorConfigProvider config={{ locale: "en-US" }}>
        <App />
      </EditorConfigProvider>
    </HashRouter>
  </StrictMode>,
);
