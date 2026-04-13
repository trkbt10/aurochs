/**
 * @file Error display component.
 */

import type { ErrorMessage } from "../types";






/** Viewer component for displaying error messages from the extension. */
export function ErrorViewer({ title, message }: ErrorMessage): React.JSX.Element {
  return (
    <div className="error-viewer">
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
