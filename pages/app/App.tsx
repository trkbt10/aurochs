/**
 * @file App entry for the aurochs demo.
 *
 * Mounts the AppProvider (which owns all file loaders and navigation state)
 * and renders the route tree.
 */

import { AppProvider } from "./context/AppContext";
import { AppRoutes } from "./routes";
import "./App.css";

/**
 * Top-level application component.
 */
export function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
