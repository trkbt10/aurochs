/**
 * @file Error display component.
 */

import type { ErrorMessage } from "../types";

export function ErrorViewer({ title, message }: ErrorMessage): React.JSX.Element {
  return (
    <div className="error-viewer">
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
